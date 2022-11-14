const {info, warn} = require('./Exports/Docs/Scripts/Logger').logger
runRoot()

async function runRoot() {
    const EXPORT_DOCS_DIR = './Exports/Docs'

    /*
    Setting up external dependencies.
    */
    global.SA = {
        projects: {
            foundations: {
                utilities: {
                    filesAndDirectories: require('./Projects/Foundations/SA/Utilities/FilesAndDirectories').newFoundationsUtilitiesFilesAndDirectories(),
                    icons: require('./Projects/Foundations/SA/Utilities/Icons').newFoundationsUtilitiesIcons()
                },
                globals: {
                    schemas: {
                        APP_SCHEMA_MAP: new Map()
                    }
                }
            }
        },
        nodeModules: {
            fs: require('fs'),
            util: require('util'),
            path: require('path'),
            jsDom: require('jsdom').JSDOM
        }
    }

    global.ED = {
        DEFAULT_LANGUAGE: 'EN',
        menuLabelsMap: new Map(),
        schemas: require(EXPORT_DOCS_DIR + '/Scripts/SchemaGeneration').schemaGeneration(),
        utilities: require(EXPORT_DOCS_DIR + '/Scripts/DocumentationGenerationUtilities').documentGenerationUtilities(),
        designSpace: require(EXPORT_DOCS_DIR + '/Scripts/DocumentationDesignSpace').documentationDesignSpace(),
        strings: require(EXPORT_DOCS_DIR + '/Scripts/DocumentationStringsUtilities').documentationStringsUtilities(),
        indexFile: EXPORT_DOCS_DIR + '/index.html',
        baseIndexFile: EXPORT_DOCS_DIR + '/index_base.html'
    }


    /* Load Environment Variables */
    let ENVIRONMENT = require('./Environment.js')
    let ENVIRONMENT_MODULE = ENVIRONMENT.newEnvironment()
    global.env = ENVIRONMENT_MODULE
    global.env.EXPORT_DOCS_DIR = EXPORT_DOCS_DIR

    if(process.argv.length > 2) {
        global.env.PATH_TO_PAGES_DIR = process.argv[2]
        global.env.REMOTE_DOCS_DIR = process.argv[3] || process.argv[2]
    }

    /*
    First thing is to load the project schema file.
    */
    global.PROJECTS_SCHEMA = require(global.env.PATH_TO_PROJECT_SCHEMA)

    /*
    Version Management
    */
    SA.version = require('./package.json').version

    const projectSchemaNames = global.PROJECTS_SCHEMA.map(project => project.name).sort()
    const categories = ED.schemas.schemaTypes.map(t => t.category).sort()

    info( 'Source files'.padEnd(20) + ' -> preparing index template')
    setSourceFileLinks()

    const results = []
    for(let i = 0; i < projectSchemaNames.length; i++) {
        await ED.designSpace.copyProjectAssets(projectSchemaNames[i])
        for(let j = 0; j < categories.length; j++) {
            const result = await run({
                project: projectSchemaNames[i],
                category: categories[j]
            })
            info(result.log)
            results.push({
                count: result.count,
                project: result.project,
                category: result.category
            })
        }
    }
        
    await ED.designSpace.copyWebServerData()
    await ED.designSpace.copyCustomJsScripts()

    buildIndexPage(projectSchemaNames, categories, results)

    const robots = `User-agent: *\nDisallow: /`
    SA.nodeModules.fs.writeFileSync(global.env.PATH_TO_PAGES_DIR + '/robots.txt', robots)

    /**
     * @param {{project: string, category: string}}
     */
    async function run(projectCategory) {
        global.SCHEMAS_BY_PROJECT = new Map()
        const app = require(EXPORT_DOCS_DIR + '/ExportDocumentationApp.js').newExportDocumentationApp()

        info('Exporting'.padEnd(20) + ' -> ' + projectCategory.project + ' -> ' + projectCategory.category)
        const count = await ED.schemas.convertProjectsToSchemas(projectCategory.project)
            .then(() => ED.designSpace.initialize(projectCategory.project))
            .then(() => setUpMenuItemsMap(projectCategory.project))
            .then(() => app.run(projectCategory))
            .then((c) => {
                ED.designSpace.finalize(projectCategory.project)
                return c
            })
        return {
            log: 'Exported'.padEnd(20) + ' -> ' + projectCategory.project + ' -> ' + projectCategory.category + ' completed ' + count + ' docs',
            count,
            project: projectCategory.project,
            category: projectCategory.category
        }

        function setUpMenuItemsMap(project) {
            info( 'Menu items'.padEnd(20) + ' -> iterating schema project map')
            /*
            Here we will put put all the menu item labels of all nodes at all
            app schemas into a single map, that will allow us to know when a phrase
            is a label of a menu and then change its style.
            */
            let appSchemaArray = global.SCHEMAS_BY_PROJECT.get(project).array.appSchema

            for(let j = 0; j < appSchemaArray.length; j++) {
                const docsSchemaDocument = appSchemaArray[j]

                if(docsSchemaDocument.menuItems === undefined) {continue}
                for(let k = 0; k < docsSchemaDocument.menuItems.length; k++) {
                    const menuItem = docsSchemaDocument.menuItems[k]
                    ED.menuLabelsMap.set(menuItem.label, true)
                }
            }
        }
    }

    /**
     * @param {string} project
     * @param {string[]} categories
     * @param {{
     *    count: number,
     *    project: string,
     *    category: string
     *  }[]} results
     */
    function buildIndexPage(projects, categories, results) {
        let html = '<div>'
        for(let i = 0; i < projects.length; i++) {
            html += '<div class="docs-definition-floating-cells"><h3>' + projects[i] + '</h3>'
            for(let j = 0; j < categories.length; j++) {
                if(results.find(r => r.project == projects[i] && r.category == categories[j]).count > 0) {
                    html += '<div class="docs-definition-floating-links"><a href="' + projects[i] + '/' + categories[j] + '/index.html">' + categories[j] + '</a></div>'
                }
                else {
                    html += '<div class="docs-definition-floating-links">' + categories[j] + '</div>'
                }
            }
            html += '</div>'
        }
        html += '</div>'

        const destination = global.env.PATH_TO_PAGES_DIR + '/index.html'
        try {
            const dom = new SA.nodeModules.jsDom(SA.nodeModules.fs.readFileSync(ED.indexFile))
            dom.window.document.getElementById('docs-content-div').innerHTML = html
            SA.nodeModules.fs.writeFileSync(destination, dom.serialize())
        }
        catch(error) {
            console.error(error)
        }
    }

    function setSourceFileLinks() {
        const dom = new SA.nodeModules.jsDom(SA.nodeModules.fs.readFileSync(ED.baseIndexFile))

        const docs = dom.window.document.createElement('link')
        docs.type = 'text/css'
        docs.rel = 'stylesheet'
        docs.href = '/' + global.env.REMOTE_DOCS_DIR + '/css/docs.css'
        dom.window.document.getElementsByTagName('head')[0].appendChild(docs)
        
        const fonts = dom.window.document.createElement('link')
        fonts.type = 'text/css'
        fonts.rel = 'stylesheet'
        fonts.href = '/' + global.env.REMOTE_DOCS_DIR + '/css/font-awasome.css'
        dom.window.document.getElementsByTagName('head')[0].appendChild(fonts)

        // adding this to the bottom of the <body> as not sure if jsdom supports `defer` tag
        const actionScripts = dom.window.document.createElement('script')
        actionScripts.type = 'text/javascript'
        actionScripts.src = '/' + global.env.REMOTE_DOCS_DIR + '/js/action-scripts.js'
        dom.window.document.getElementsByTagName('body')[0].appendChild(actionScripts)

        SA.nodeModules.fs.writeFileSync(ED.indexFile, dom.serialize())
    }
}
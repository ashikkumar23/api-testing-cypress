const {
    defineConfig
} = require("cypress");

module.exports = defineConfig({
    reporter: 'cypress-multi-reporters',
    reporterOptions: {
        configFile: 'reporter-config.json'
    },
    e2e: {
        baseUrl: 'https://gorest.co.in',
        setupNodeEvents(on, config) {
            on('task', {
                log(message) {
                    console.log(message + '\n');
                    return null;
                    // Then to see the log messages in the terminal
                    // Use: cy.task("log", "my message");
                },
            });
        }
    },
});
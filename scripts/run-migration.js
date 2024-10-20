// Import the child_process module
// eslint-disable-next-line @typescript-eslint/no-var-requires, no-undef
const { exec } = require("child_process");

// Function to run the migration command
function runMigration() {
    // Execute the npm run migration command
    exec(
        "npx cross-env NODE_ENV=migration npm run migration:run -- -d src/config/data-source.ts",
        (error, stdout, stderr) => {
            if (error) {
                // eslint-disable-next-line no-console, no-undef
                console.error(`Error executing migration: ${error.message}`);
                return;
            }

            if (stderr) {
                // eslint-disable-next-line no-console, no-undef
                console.error(`Error output: ${stderr}`);
                return;
            }

            // Log the output of the command
            // eslint-disable-next-line no-console, no-undef
            console.log(`Migration output: ${stdout}`);
        },
    );
}

// Run the migration function
runMigration();

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
// List all json files
let files = [];
try {
    files = fs.readdirSync(publicDir).filter(f => f.endsWith('.json') && f !== 'manifest.json');
} catch (e) {
    console.error('Error reading dir:', e);
    process.exit(1);
}

console.log('Found JSON files:', files);

files.forEach(file => {
    const filePath = path.join(publicDir, file);
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        let data;
        try {
            data = JSON.parse(content);
        } catch (e) {
            console.warn(`Skipping ${file}: Invalid JSON`);
            return;
        }

        let modified = false;
        let count = 0;

        if (Array.isArray(data)) {
            data.forEach(item => {
                if (item && typeof item.name === 'string') {
                    const original = item.name.trim();
                    // Regex to remove trailing ! or .
                    // The user said "最后的", implies at the very end.
                    if (/[!.]$/.test(original)) {
                        const newName = original.replace(/[!.]$/, '');
                        // Check if it still has one? User didn't specify recursive, but let's assume one is enough.
                        // Actually, if there are multiple "World!!", maybe remove all?
                        // "最后的" usually implies the suffix.
                        // Let's stick to removing the last character if it matches.

                        item.name = newName;
                        modified = true;
                        count++;
                        // console.log(`[${file}] "${original}" -> "${newName}"`);
                    }
                }
            });
        }

        if (modified) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`Updated ${file}: Fixed ${count} words.`);
        } else {
            console.log(`No changes in ${file}.`);
        }
    } catch (e) {
        console.error(`Error processing ${file}:`, e);
    }
});

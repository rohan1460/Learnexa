
const pdf = require('pdf-parse');
const fs = require('fs');

async function test() {
    try {
        console.log("Testing PDFParse with disableWorker...");
        const { PDFParse } = require('pdf-parse');
        const data = fs.readFileSync('scratch/dummy.pdf');
        
        // Try to set worker to something blank or disable it globally if possible
        // PDFParse.setWorker(''); // Maybe try this if it fails
        
        const parser = new PDFParse({ 
            data: new Uint8Array(data),
            disableWorker: true,
            verbosity: 0
        });
        const result = await parser.getText();
        console.log("SUCCESS: Extracted text:", result.text);
    } catch (err) {
        console.error("FAILURE:", err.message);
    }
}

test();

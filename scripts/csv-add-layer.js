const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const readCsv = 'outputs/gcode_v1.csv';  // Caminho para o CSV de entrada
const writeCsv = 'outputs/gcode.csv';   // Caminho para o CSV de saída

const csvWriter = createCsvWriter({
    path: writeCsv,
    header: [
        { id: 'Line', title: 'Line' },
        { id: 'Command', title: 'Command' },
        { id: 'X', title: 'X' },
        { id: 'Y', title: 'Y' },
        { id: 'Z', title: 'Z' },
        { id: 'E', title: 'E' },
        { id: 'F', title: 'F' },
        { id: 'Comment', title: 'Comment' },
        { id: 'Layer', title: 'Layer' }
    ]
});

let currentLayer = 0;  // ou 1, dependendo de onde você começa a contar
const rows = [];

fs.createReadStream(readCsv)
    .pipe(csv())
    .on('data', (row) => {
        // Incrementar currentLayer se for uma mudança de camada
        if (row.Z !== "") {
            currentLayer++;
        }
        row.Layer = currentLayer;
        rows.push(row);
    })
    .on('end', async () => {
        await csvWriter.writeRecords(rows);
        console.log('CSV file written with layer information.');
    });

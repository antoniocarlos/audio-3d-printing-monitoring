const fs = require('fs');

const inputFile = '3DBenchy_2.gcode';  // Provide the path to your G-code file
const outputFile = 'outputs/path_for_output.csv';      // Provide the path for the desired output CSV file

const gcodeToCsv = (inputFile, outputFile) => {
    const gcodeContent = fs.readFileSync(inputFile, 'utf8');
    const lines = gcodeContent.split('\n');

    let csvContent = 'Line,Command,X,Y,Z,E,F,Comment\n';  // Header for the CSV file

    lines.forEach((line, index) => {
        let command = "", x = "", y = "", z = "", e = "", f = "", comment = "";

        const parts = line.split(';');  // Splitting based on comments
        if (parts[1]) comment = parts[1].trim();

        const commands = parts[0].trim().split(' ');

        if (commands[0]) command = commands[0];

        commands.forEach(cmd => {
            if (cmd.startsWith("X")) x = cmd.slice(1);
            else if (cmd.startsWith("Y")) y = cmd.slice(1);
            else if (cmd.startsWith("Z")) z = cmd.slice(1);
            else if (cmd.startsWith("E")) e = cmd.slice(1);
            else if (cmd.startsWith("F")) f = cmd.slice(1);
        });

        csvContent += `${index + 1},${command},${x},${y},${z},${e},${f},${comment}\n`;
    });

    fs.writeFileSync(outputFile, csvContent);
}

gcodeToCsv(inputFile, outputFile);

// (() => {
//     try {
//         console.log('entrou');
        
//     } catch (error) {
//         console.log(error.message);
//     }
// })

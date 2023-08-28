const fs = require("fs");
const WavDecoder = require("wav-decoder");
const csvWriter = require("csv-writer").createObjectCsvWriter;

// Initialize a CSV writer
const writer = csvWriter({
    path: "outputs/layer-241-amplitude.csv",
    header: [
        { id: "time", title: "TIME" },
        { id: "amplitude", title: "AMPLITUDE" },
    ],
});

async function wavToCsv() {
    // Read the .wav file
    const buffer = fs.readFileSync("assets/layer241.wav");

    // Decode the .wav file
    const audioData = await WavDecoder.decode(buffer);

    // Extract channel data (assuming first channel) and sample rate
    const samples = audioData.channelData[0];
    const sampleRate = audioData.sampleRate;

    // Prepare CSV records
    const records = [];
    for (let i = 0; i < samples.length; i++) {
        const time = i / sampleRate;
        const amplitude = samples[i];
        records.push({ time, amplitude });
    }

    // Write records to CSV
    writer.writeRecords(records).then(() => {
        console.log("...Done writing CSV");
    });
}

wavToCsv();

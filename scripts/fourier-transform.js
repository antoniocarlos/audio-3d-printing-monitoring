const fs = require('fs');
const WavDecoder = require('wav-decoder');
const csvWriter = require('csv-writer').createObjectCsvWriter;
const FFT = require('fft-js').fft;
const FFTUtil = require('fft-js').util;

// Initialize a CSV writer
const writer = csvWriter({
    path: 'outputs/layer-241-fourier-transform.csv',
    header: [
        { id: 'frequency', title: 'FREQUENCY' },
        { id: 'magnitude', title: 'MAGNITUDE' }
    ]
});

// Function to trim the samples array to the nearest lower power of two
function trimToPowerOfTwo(arr) {
    const targetLength = Math.pow(2, Math.floor(Math.log2(arr.length)));
    return arr.slice(0, targetLength);
}

async function processWavFile() {
    try {
        // Read the .wav file
        const buffer = fs.readFileSync('assets/layer241.wav');

        // Decode the .wav file
        const audioData = await WavDecoder.decode(buffer);

        // Extract channel data (assuming first channel) and sample rate
        const samples = audioData.channelData[0];
        const sampleRate = audioData.sampleRate;

        // Trim samples to nearest lower power of two
        const trimmedSamples = trimToPowerOfTwo(samples);

        // Perform FFT
        const phasors = FFT(trimmedSamples);

        // Calculate frequencies and magnitudes
        const frequencies = FFTUtil.fftFreq(phasors, sampleRate);
        const magnitudes = FFTUtil.fftMag(phasors);

        // Prepare CSV records
        const records = frequencies.map((frequency, index) => ({
            frequency,
            magnitude: magnitudes[index]
        }));

        // Write records to CSV
        await writer.writeRecords(records);
        console.log('...Done writing CSV');
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

// Run the function
processWavFile();

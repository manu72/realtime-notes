class AudioProcessor extends AudioWorkletProcessor {
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            const samples = input[0];
            let sum = 0;
            
            for (let i = 0; i < samples.length; i++) {
                sum += samples[i] * samples[i];
            }
            
            const rms = Math.sqrt(sum / samples.length);
            const db = 20 * Math.log10(rms);
            
            if (db > -50) {
                this.port.postMessage({
                    type: 'audio-level',
                    db: db,
                    rms: rms
                });
            }
        }
        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);
document.addEventListener("DOMContentLoaded", () => {
    const audioInput = document.getElementById("audioInput");
    const audioPlayer = document.getElementById("audioPlayer");
    const transcribeBtn = document.getElementById("transcribeBtn");
    const transcriptionResult = document.getElementById("transcriptionResult");
    const downloadPdfBtn = document.getElementById("downloadPdfBtn");

    let audioFile;

    audioInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            audioFile = file;
            const objectURL = URL.createObjectURL(file);
            audioPlayer.src = objectURL;
        }
    });

    transcribeBtn.addEventListener("click", async () => {
        if (!audioFile) {
            alert("Por favor, selecciona un archivo de audio primero.");
            return;
        }

        transcriptionResult.textContent = "Transcribiendo...";

        try {
            const transcription = await transcribeAudio(audioFile);
            transcriptionResult.innerHTML = formatTranscription(transcription);
            downloadPdfBtn.style.display = "block";
        } catch (error) {
            transcriptionResult.textContent = "Error en la transcripción.";
            console.error("Error en la transcripción:", error);
        }
    });

    downloadPdfBtn.addEventListener("click", () => {
        const text = transcriptionResult.textContent;
        if (!text || text === "Transcribiendo...") {
            alert("No hay transcripción disponible.");
            return;
        }
        previewPDF(text);
    });

    async function transcribeAudio(file) {
        const formData = new FormData();
        formData.append("audio", file);

        try {
            const response = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&language=es&detect_language=true&diarize=true", {
                method: "POST",
                headers: {
                    "Authorization": "Token a1e4fc3df9c921c926d43326d49013ff3d3e7dcf", // Reemplaza con tu API Key de Deepgram
                    "Content-Type": file.type
                },
                body: file,
            });

            if (!response.ok) {
                const errorDetails = await response.text();
                throw new Error(`Error en la API: ${errorDetails}`);
            }

            const data = await response.json();
            console.log("Respuesta de Deepgram:", data); // Para inspeccionar la respuesta en la consola

            if (data.results.channels[0].alternatives.length > 0) {
                return formatDiarizedTranscription(data.results.channels[0].alternatives[0]);
            } else {
                return "No se pudo obtener la transcripción.";
            }
        } catch (error) {
            console.error("Error al comunicarse con Deepgram:", error);
            throw error;
        }
    }

    function formatDiarizedTranscription(alternative) {
        if (!alternative.words || alternative.words.length === 0) {
            return alternative.transcript || "No se pudo obtener una transcripción válida.";
        }
        
        let formattedText = "";
        let currentSpeaker = "";
        alternative.words.forEach(word => {
            if (word.speaker !== currentSpeaker) {
                formattedText += `\n\nHablante ${word.speaker}:\n`;
                currentSpeaker = word.speaker;
            }
            formattedText += (word.punctuated_word || word.word) + " ";
        });
        return formattedText.trim();
    }

    function formatTranscription(text) {
        return text.split('\n').map(line => `<p>${line}</p>`).join('');
    }

    function previewPDF(text) {
        if (!window.jspdf) {
            alert("Error: jsPDF no está disponible");
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        let marginTop = 10;
        let maxWidth = 180;
        let lineHeight = 10;
        let lines = doc.splitTextToSize(text, maxWidth);
        
        lines.forEach((line, index) => {
            doc.text(line, 10, marginTop + (index * lineHeight));
        });

        const pdfDataUri = doc.output("datauristring");
        const previewWindow = window.open();
        if (!previewWindow) {
            alert("Habilita las ventanas emergentes para ver la vista previa.");
            return;
        }
        previewWindow.document.write(`<iframe width='100%' height='100%' src='${pdfDataUri}'></iframe>`);
    }
});


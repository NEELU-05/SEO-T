const FileHandler = {
    readFile: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            if (file.name.endsWith('.docx')) {
                reader.onload = function (event) {
                    const arrayBuffer = event.target.result;
                    if (window.mammoth) {
                        window.mammoth.extractRawText({ arrayBuffer: arrayBuffer })
                            .then(result => resolve(result.value))
                            .catch(err => reject(err));
                    } else {
                        reject(new Error('Mammoth library not loaded for .docx'));
                    }
                };
                reader.readAsArrayBuffer(file);
            } else {
                reader.onload = function (event) {
                    resolve(event.target.result);
                };
                reader.readAsText(file);
            }
        });
    }
};

if (typeof window !== 'undefined') window.FileHandler = FileHandler;

import JSZip from 'npm:jszip@3.10.1';

Deno.serve(async (req) => {
    try {
        const response = await fetch('https://meteo.ecmeteo.org:9080/api/get-meta', {
            headers: {
                'Authorization': 'Bearer GvYkwfJ7Zqz2yKIo4LLe'
            }
        });

        if (!response.ok) {
            return Response.json({ error: `Server responded with ${response.status}` }, { status: 502 });
        }

        const arrayBuffer = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);

        let jsonData = null;
        for (const [filename, file] of Object.entries(zip.files)) {
            if (!file.dir && filename.endsWith('.json')) {
                const content = await file.async('string');
                jsonData = JSON.parse(content);
                break;
            }
        }

        if (!jsonData) {
            return Response.json({ error: 'No JSON file found in ZIP' }, { status: 500 });
        }

        return Response.json(jsonData);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
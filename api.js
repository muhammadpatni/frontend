
const base_url = "http://localhost:5227/Datasouce";

async function GetData(params) {
    try {
        const response = await fetch(base_url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(params)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.Error || result.Message || `HTTP Error: ${response.status}`
            );
        }

        return result; // Direct Array of Objects

    } catch (error) {
        console.error("GetData Error:", error.message);
        throw error;
    }
}

// Testing
async function main() {

    const data = await GetData({
        tablename: "Containers",
        Whereclause: ""
    });

    console.log(data);
}

main().catch(console.error);

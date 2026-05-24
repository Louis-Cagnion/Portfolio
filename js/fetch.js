/**
 * @param {string} url
 * 
 * @returns {Promise} A promise of a response in json format
 */
export async function fetchData(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                "Accept": "application/json"
            }
        })
        if (!response.ok) {
            throw new Error(`Can't get data from url : ${response.status}`)
        }
        return response.json()
    } catch (e) {
        console.log(e.message)
    }
}
/**
 * @param {const string} url
 * 
 * @returns {Promise}
 */
export async function getData(url) {
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
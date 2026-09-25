/**
 * Fetches publication data from the ORCID API for a given ID.
 * @param {string|number} orcidId - The ORCID identifier.
 * @returns {Promise<Array>} A promise that resolves to an array of publication objects.
 */
async function getOrcidPubs(orcidId) {
    const url = `https://pub.orcid.org/v3.0/${orcidId}/works`;
    
    try {
        const response = await fetch(url, {
            headers: { "Accept": "application/json" }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log(data)
        // The actual list of publications is located under the 'group' key
        return data.group || []; 

    } catch (error) {
        console.error("Error fetching ORCID data:", error);
        return [];
    }
}

/**
 * Checks if all keys are acessible, in order, and returns the value if so, otherwise
 * returns the empty value. Doing this as Optional Chaining looks absolutely horrendous.
 */
function checkAndGetKeySequence(pub, keyList, defaultValue = null) {
    let cur = pub;
    for(const k of keyList) {
        if(cur === null || cur === undefined || !(k in cur)) {
            return defaultValue;
        }
        cur = cur[k]
    }
    return cur;
}

/**
 * Formats the raw ORCID data into a clean list of publication strings.
 * @param {Array} orcidPubList - The raw publication data from the API.
 * @returns {Array<string>} An array of formatted publication titles/links.
 */
function formatOrcidPubs(orcidPubList, orcidId) {
    const formattedList = [];

    for (const pub of orcidPubList) {       
        //console.log(pub);
        // Title
        const title = checkAndGetKeySequence(pub, ["work-summary", 0, "title", "title", "value"], ""); 
        // URL
        const internalExternalIdUrl = checkAndGetKeySequence(pub, ["work-summary", 0, "external-ids", "external-id", 0, "external-id-url", "value"], "");
        const workUrl = checkAndGetKeySequence(pub, ["external-ids", "external-id", 0, "external-id-url", "value"], ""); 
        const externalIdUrl = checkAndGetKeySequence(pub, ["external-ids", "external-id", 0, "external-id-url", "value"], "");
        // Get any of the url above, otherwise direct to the Orcid Page as a Backup
        const url = externalIdUrl || workUrl || internalExternalIdUrl || `https://orcid.org/${orcidId}`;
        // Journal Name, should check for other types of work and substitute the "journal-title"
        // TODO/FIXME: This needs to be expanded as we roll out the website
        const journalName = checkAndGetKeySequence(pub, ["work-summary", 0, "journal-title", "value"], "");

        // We combine the information to make it presentable
        formattedList.push(`<li><a href="${url}">${title}. ${journalName}</a></li>`);
    }

    return formattedList;
}

/**
 * Main function to fetch data and display it in the HTML.
 * @param {string} orcidId - The ORCID ID to search for.
 * @param {string} targetElementId - The ID of the HTML element where results will be inserted.
 */
async function loadOrcidPublications(orcidId, targetElementId) {
    const targetElement = document.getElementById(targetElementId);

    if (!targetElement) {
        console.error(`Target element with ID "${targetElementId}" not found.`);
        return;
    }

    // Clear previous content
    targetElement.innerHTML = 'Loading publications...';

    try {
        // 1. Fetch the data
        const rawData = await getOrcidPubs(orcidId);

        if (rawData.length === 0) {
            targetElement.innerHTML = `<p>No publications found for ORCID: ${orcidId}</p>`;
            return;
        }

        // 2. Format the data
        const formattedItems = formatOrcidPubs(rawData, orcidId);

        // 3. Insert the formatted data into the HTML
        let htmlContent = '<ul style="text-align: left; padding-left: 20px; list-style-position: inside;">';
        htmlContent += formattedItems.map(item => `${item}`).join('');
        htmlContent += '</ul>';

        targetElement.innerHTML = htmlContent;

    } catch (error) {
        console.error("Failed to load and display ORCID data:", error);
        targetElement.innerHTML = `<p style="color: red;">An error occurred while fetching publication data.</p>`;
    }
}


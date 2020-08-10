// Initialise Apps framework client. See also:
// https://developer.zendesk.com/apps/docs/developer-guide/getting_started

// Query Zendesk for any New/Open/Pending/On-Hold tickets based on the shop URL.
// Display results with ticket group, subject, status and date  of last public comment.
// Query Zendesk for any ticket with the shop URL and display the ticket satisfcation of that shop (total tickets rated / tickets rated good)

let client = ZAFClient.init();
client.invoke('resize', { width: '100%', height: '300px' });

// Gather ticket data

client.get(['ticket', 'ticket.customField:custom_field_23800156']).then(async (data) => {

    let url = data['ticket.customField:custom_field_23800156'],
        ticketData = data['ticket'],
        ticketNumber = ticketData.id,
        requesterEmail = ticketData.requester.email;

    let highPriorityArray = ['seg-hvm', 'seg-managed_services', 'seg-ms_platinum', 'seg-ms_diamond'];
    let isHighPriority = ticketData.tags.some(r=> highPriorityArray.includes(r));

    let resultsData = {
        urlResults: {},
        requesterResults: {}
    }

    resultsData = {
        urlResults: await getTicketsByUrl(url, ticketNumber),
        requesterResults: await getTicketsByRequester(requesterEmail, ticketNumber),
        isHighPriority: isHighPriority
    }

    showInfo(resultsData)
})

async function getTicketsByUrl(url, ticketNumber) {

    let urlResults = {
        tickets: {},
        ratings: {}
    };

    if (url.includes('myshopify.com')) {

        let ticketOptions = {
            url: `/api/v2/search.json?query=status<=solved fieldvalue:${url}`,
            type: 'GET'
        };

        // Request ticket search
        let {results} = await client.request(ticketOptions);

        // Calculate satisfaction percentage from results
        let ratings = calculatePerc(results);

        // Find Group Name for each ticket in list
        let tickets = Object.values(results);
        let newLength = tickets.length;

        for (let i=0; i<tickets.length; i++){
            let ticket = tickets[i];

            if (ticket.id === ticketNumber){
                delete tickets[i];
                newLength--;
                continue;
            }

            ticket.group_name = await getGroups(ticket);
            ticket.updated_at = formatDate(ticket.updated_at);
        }

        tickets.newLength = newLength;

        urlResults = {
            tickets: tickets,
            ratings: ratings
        }

    }

    return urlResults;

}

async function getTicketsByRequester(requesterEmail, ticketNumber) {
    
    let requesterResults = {
        tickets: {},
        ratings: {}
    };

    let ticketOptions = {
        url: `/api/v2/search.json?query=status<=solved requester:${requesterEmail}`,
        type: 'GET'
    };

    // Request ticket search
    let {results} = await client.request(ticketOptions);

    // Calculate satisfaction percentage from results
    let ratings = calculatePerc(results);

    // Find Group Name for each ticket in list
    let tickets = Object.values(results);
    let newLength = tickets.length;

    for (let i=0; i<tickets.length; i++){
        let ticket = tickets[i];

        if (ticket.id === ticketNumber){
            delete tickets[i];
            newLength--;
            continue;
        }

        ticket.group_name = await getGroups(ticket);
        ticket.updated_at = formatDate(ticket.updated_at);
    }

    tickets.newLength = newLength;

    requesterResults = {
        tickets: tickets,
        ratings: ratings
    }

    return requesterResults;
}

async function getGroups(ticket) {

    let groupOptions = {
        url: `/api/v2/groups/${ticket.group_id}.json`,
        type: 'GET'
    }

    let {group} = await client.request(groupOptions);
    return group.name;
}

function calculatePerc(tickets) {
    let posNum = 0,
    totalRated = 0;

    for (let i=0; i<tickets.length; i++) {

        let ticket = tickets[i];

        switch (ticket.satisfaction_rating.score) {
        case "good":
            posNum++;
            totalRated++;
            break;
        case "bad":
            totalRated++;
            break;
        }
    }

    // Calculate satisfaction percentage
    let posPerc = (posNum/totalRated) * 100,
        rating = posPerc > 85 ? "good" : "bad",
        result = {
            rating_good_percentage: posPerc,
            rating_good_count: posNum,
            total_ticket_count: totalRated,
            rating_class: rating
        };
    return result;
}

function formatDate(date) {
    let current_datetime = new Date(date)
    let formatted_date = current_datetime.getFullYear() + "-" + (current_datetime.getMonth() + 1) + "-" + current_datetime.getDate() + " (" + current_datetime.getHours() + ":" + ( current_datetime.getMinutes() < 10 ? '0' : '' ) + current_datetime.getMinutes() + ")";
    return formatted_date;
}

// Handlebars Functions //

Handlebars.registerHelper('if_greater', function(a, b, opts) {
    if (a > b) {
        return opts.fn(this);
    } else {
        return opts.inverse(this);
    }
});

function showInfo(requester_data) {
    let source = $("#requester-template").html();
    let template = Handlebars.compile(source);
    let html = template(requester_data);
    $("#content").html(html);
}

// Collapse Function //

function toggleFunction() {
    let collapse = event.currentTarget.parentElement.querySelector('.app-section[data-collapsed]')
    let isTrueSet = (collapse.getAttribute('data-collapsed') == 'true');
    collapse.setAttribute('data-collapsed', !isTrueSet);
}
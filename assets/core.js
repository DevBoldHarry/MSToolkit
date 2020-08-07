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
        ticketNumber = ticketData.id;

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
    for(let i=0; i<tickets.length; i++){
        let groupOptions = {
            url: `/api/v2/groups/${tickets[i].group_id}.json`,
            type: 'GET'
        }
        let {group} = await client.request(groupOptions);
        tickets[i].group_name = group.name;

        // Add property if IDs match
        if(ticketNumber === tickets[i].id)
            tickets[i].currentTicket = true;
    }

    const resultsData = {
        tickets: tickets,
        ratings: ratings
    }

    showInfo(resultsData)
})

function showInfo(requester_data) {
    let source = $("#requester-template").html();
    let template = Handlebars.compile(source);
    let html = template(requester_data);
    $("#content").html(html);
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

// Register Handlebars if greater than operator (if a > b)
Handlebars.registerHelper('if_greater', function(a, b, opts) {
    if (a > b) {
        return opts.fn(this);
    } else {
        return opts.inverse(this);
    }
});

## Name
weekly-rental-price-sweep

## Description
Rental quote sweep near 02054; records results to Google Drive for the Rental Radar artifact.

## Content
# v3

INIT:

You are running the car rental price sweep for Jared's "Rental Radar" artifact.

Keep details of each run's quote data as a JSON doc in Google Drive; tin internal memory; he Rental Radar artifact auto-load this data for presentation and analysis. 



RENTAL RATES SWEEP PROCEDURE: 

    Load QUOTESEARCH = search

    Load CAR RENTAL COMPANY TABLE = companies

    Load QUITESEARCH PARAMETERS = defaults 

    new quotes[], screenshots[]



# CORE LOOP:

Foreach company in companies:



    1. run search(company, defaults) = quote

    2. quotes[company] = quote

    3. screenshots[company] = take a screenshot of the quote

    4. remember parameters, errors, quotes, screenshots



END: 



1. Create a Google Drive file 

   1. Drive MCP create_file()

   2. contentMimeType = 'text/plain'

   3. filename = rental-radar-sweep-YYYY-MM-DD.md using today's date

   4. Content is one JSON object, no prose

   5.  Fill in as many ("")  with real data as you can  (: 

(

    "type":"rental-radar-sweep",

    "sweepDate":"YYYY-MM-DD",

    "meta":

    (

        "searchCount":"",

        "durationMin":"",

        "method":"chrome",

        "notes":"",

        "errors":"",

        "tokensBurned":"",

    ),



    "observations":[



        (

            "company":"",

            "branch":"",

            "quote": "",

            "carClass":"economy",

            "pickupDate":"YYYY-MM-DD"

        ), ... 

    ]

)

>





define QUOTESEARCH (

    STARTDATE: {Today's date + 1} 

    ENDDATE: { STARTDATE +7 calendar days a}

    TIME: {10AM}

     CARTYPE: {Economy} 

     RESERVATIONURL: company-> 

     LOCATION[ZIP]: company 

) {

1. Access the connected browsers via Claude-in-Chrome

2. Navigate to the  RESERVATIONURL

3. Locate the reservation form (probably on the very top of the homepage)

4. Find the "Pickup Location" form field.   (Aliases for this field may include "From Where?" "start Here" "Local office", or similar.)   

5. Type in the LOCATION.  Observe page state and any user interface changes occurring while typing; typically a list of matching/validated branches, zipcodes, city names, or nearby airport names will appear as best fit guesses.  Gracefully handle data entry by pausing momentarily after the LOCATION text has been fully typed.  When the website shows a matching option, click on it.  Carefully evaluate the possible options and remove from consideration any with characteristics not matching our target (for example, "Norwood, MD" may appear while you type in "Norwood" but you must patiently wait for the list to populate with a different location until "Norwood, MA"  is found.) Some websites may defer this process until the form is entirely filled out, and others may present a pop-up window helper instead of a list.   if no suitable matching location is available on the list, or if the list displays a message indicating "no locations found" try again using the fallback ZIP if provided, or fire off a quick web search in a sub agent to locate the ZIP for the  LOCATION we are attempting to match. Ensure the HTML field has successfully populated correctly before proceeding , unless the matching is deferred. otherwise, discontinue with a descriptive error.

6.  Leave "return location" field on the default state. This may require clicking a checkbox indicating the drop off and pickup are the same

7. Find the reservation start date field and enter the STARTDATE. This may mean navigating a pop-out calendar widget, typing in a preformatted date field, or similar. Prefer simply typing in the date in MM/DD/YYYY format. 

8. repeat the previous step with the reservation return date field, using ENDDATE

9. if a car type field or selector appears, choose CARTYPE (or the lowest cost option)

10. Navigate the site until a Quote price can be found.  ignore/leave on default any remaining fields corresponding to age, coupons, frequent renter, membership number,  unless error message appears indicating it required field has been missed in which case use your best judgment

11 Save an image of the browser window showing the full reservation info (start/end date, location, quoted cost) "YYYY-MM-DD - [COMPANY NAME] - MM-DD - RATE" where YY-MM-DD refers to today; MM-DD at the end is the STARTDATE 

12 Remember the parameters and quote for 

}
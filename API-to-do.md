## GET /crm/dashboard

- `query param` : startDate, endDate, recentLeadLimit
- `Response` :

```json
{
    "leadStatistics" : {
        "totalLead" : #,
        "onlineLead" : #,
        "offlineLead" : #,
        "loggedInLead" : #
    },
    "enrollmentStatistics" : {
        "totalEnrollment" : #,
        "onlineEnrollment" : #,
        "physicalEnrollment" : #
    },
    "applicationStatisticsByIntake" : [
        {
            "submitted" : #,
            "conditionalOffer" : #,
            "unconditionalOffer" : #,
            "interview" : #,
            "payment" : #,
            "casOrCoeOrI20" : #,
            "visa" : #
        }
    ],
    "leadStatusDistribution" : {
        "newLead" : #,
        "eligible" : #,
        "notEligible" : #,
        "unreachable" : #,
        "visited" : #
    },
    "quickOverview" : {
        "eligibleLeadRate" : #,
        "applicationRate" : #,
        "visaRate" : #,
        "enrollRate" : #
    },
    "recentLeads" : [
        {
            "name" : "",
            "email" : "",
            "phone" : "",
            "targetUniversity" : "",
            "status" : ""
        }
    ]
    
}
```


### BLL logics for the response : 

#### `applicationStatisticsByIntake`
- will not be hampered by the startDate & endDate of the input
- we have fixed Intake range months : Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec
    - so we have to group based on this month range
-  the number suggest the ApplicationStage. so the application on each mentioned stage would be count

#### `leadStatistics`
- will be hampered by the startDate & endDate of the input
- query `LeadCrmInfos` where `registerDate` is in the range
- `totalLead` : total entry
- `onlineLead` / `offlineLead` / `loggedInLead` = LeadCrmInfos.`registerSource`


#### `enrollmentStatistics`
- will be hampered by the startDate & endDate of the input
- query `LeadCrmInfos` where `enrollmentDate` is in the range
- "onlineEnrollment" / "physicalEnrollment" = LeadCrmInfos.`enrollmentStatus` ( offline == physical)

#### `leadStatusDistribution`
- will be hampered by the startDate & endDate of the input
- basically LeadCrmInfos.leadStatus distribution on that time range

#### `quickOverview`
- will be hampered by the startDate & endDate of the input
- eligibleLeadRate -> LeadCrmInfos.leadStatus = Eligible
- applicationRate -> LeadCrmInfos.hasAnyApplication = true
- visaRate -> LeadCrmInfos.hasSuccessfulVisa = true
- enrollRate -> LeadCrmInfos.enrollmentStatus != null or enrollmentDate != null

#### `recentLeads`
- will not be hampered by the startDate & endDate of the input
- will be hampered by recentLeadLimit
- basically query by LeadCrmInfos.registerDate and populate related data
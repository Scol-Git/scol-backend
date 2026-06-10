# CRM APIs

## Todo
- Add Lead
- Update Lead
- Lead List
- drop down data




## Add New Lead
- Endpoint: `POST /crm/leads`
- Request Body:
```json
{
    "name": "John Doe", //mandatory
    "phone": "01837917991", //mandatory
    "email": "john.doe@example.com", 
    "address": "123 Main St, Anytown, USA", 
    "city": "Anytown", 
    "gender": "male", 
    "targetCountryId" : "uuid", 
    "consultantUserId" : "uuid", 
    "registerSource": "website", 
    "leadStatus": "active", // default : NewLead
    "hasPassedEnglishTest": true, // default : null
}
```
- Response Body:
```json
{
    "success": true,
    "message": "Lead created successfully",
    "newLeadInfo" {
        "phone": "01837917991",
        "password": "string"
    }    
}
```

## Update Lead
- Endpoint: `PUT /crm/leads/:id`
- Request Body:
```json
{
    "name": "John Doe", //mandatory
    "phone": "01837917991", //mandatory
    "email": "john.doe@example.com", 
    "address": "123 Main St, Anytown, USA", 
    "city": "Anytown", 
    "gender": "male", 
    "targetCountryId" : "uuid", 
    "consultantUserId" : "uuid", 
    "registerSource": "website", 
    "leadStatus": "active", // default : NewLead
    "hasPassedEnglishTest": true, // default : null
    "enrollmentStatus": "enrolled", // default : null
}
```
- Response Body:
```json
{
    "success": true,
    "message": "Lead updated successfully"
}
```

## Lead List
- Endpoint: `POST /crm/leads/list`
- Request Body:
```json
{
    "pagination": {
        "cursor": "eyJyYW5rU2NvcmUiOjk1MDAuLi4",
        "limit": 15
    },
    "searchText": "John Doe",
    "filters": {
        "targetCountryIds": [
            "uuid1",
            "uuid2"
        ],
        "leadStatuses": ["active", "inactive"],
        "consultantUserIds": [
            "uuid1",
            "uuid2"
        ],
        "registerSources": ["website", "offline"],
        "enrollmentStatuses": ["online", "offline"],
    },
    "ranges": {
        "dateRange": {
            "startDate": "2026-01-01",
            "endDate": "2026-12-31"
        }
    },
    "flags": {
        "hasPassedEnglishTest": true
    }
}
```
- Response Body:
```json
{
    "success": true,
    "message": "Lead list fetched successfully",
    "pagination": {
      "cursor": "eyJyYW5rU2NvcmUiOjUwMDAsImNvdXJzZUludGFrZUlkIjoiMDAyOTU0OTctYjE4Ny00MmY2LWE5ODYtZmY4MTBhOGIwMDI5In0",
      "limit": 15,
      "hasNext": true
    },
    "leads": [
        {
            "id": "uuid1",
            "name": "John Doe",
            "phone": "01837917991",
            "email": "john.doe@example.com",
            "leadStatus": "active",
            "consultantInfo" : {
                "userId": "uuid1",
                "name": "John Doe",
            },
            "targetCountryInfo" : {
                "countryId": "uuid1",
                "name": "United States",
            },
            "registerSource": "offline",
            "registerDate": "2026-01-01",
            "enrollmentStatus": "online",
            "enrollmentDate": "2026-01-01",
        }
    ]
}
```

## Drop Down Data
- Endpoint: `GET /crm/leads/dropdown-data`
- Response Body:
```json
{
    "targetCountries": [
        {
            "countryId": "uuid1",
            "countryName": "United States",
        }
    ],
    "consultantUsers": [
        {
            "userId": "uuid1",
            "name": "John Doe",
        }
    ],
    "registerSources": [
        "Offline",
        "Online",
        "LoggedIn",
    ],
    "leadStatuses": [
        "NewLead",
        "Eligible",
        "NotEligible",
        "Unreachable",
        "Visited",
    ],
    "enrollmentStatuses": [
        "Online",
        "Offline",
    ]        
}
```
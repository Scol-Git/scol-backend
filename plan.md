## POST /crm/applications/list


Response : 


"statistics" : {
    "totalApplications" : #,
    "pendingReview" : #,
    "applicationSubmitted" : #,
    "pendingDocuments" : #,
}

- totalApplications = Application Table's entries according to the given inputs
- applicationSubmitted = Application Table's entries which currentSysApplicationStageId >= (ApplicationStage = "SUBMITTED")
- pendingDocuments = ApplicationRequiredDocuments which belongs to the Applications and isRequired = True but there is no ApplicationDocuments of the applicationRequirementId
- pendingReview = Every ApplicationDocuments belonging to the Applications where overallStatus = "Pending"
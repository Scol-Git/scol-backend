2 Apis for Advanced search

1. GET search/advanced/filters
Response:
```json
{
  "filters": [
    {
      "name": "country",
      "values": [{
        "id": "123",
        "name": "United States"
      }, {
        "id": "456",
        "name": "Canada"
      }]
    },
    {
      "name": "programme",
      "values": [{
        "id": "123",
        "name": "MBA"
      }, {
        "id": "456",
        "name": "MS"
      }]
    }
  ]
}
```

2. GET categories/cities?countryId=123
Response:
```json
{
  "cities": [{
    "id": "123",
    "name": "New York"
  }, {
    "id": "456",
    "name": "Los Angeles"
  }]
}
```
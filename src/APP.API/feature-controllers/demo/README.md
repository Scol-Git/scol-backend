# Entity Relationship Demo Controller

This controller provides Swagger endpoints to test and demonstrate entity relationships.

## Accessing the Demo Endpoints

### 1. Via Swagger UI
1. Start your NestJS application
2. Navigate to: `http://localhost:YOUR_PORT/api` (or your Swagger path)
3. Look for the **"Demo - Entity Relationships"** tag
4. Try the endpoints interactively

### 2. Via Console Logs
The service uses the logger, so all relationship access is logged to the console. Check your application logs to see:
- Which relationships are being accessed
- What data is returned
- Relationship counts and details

## Available Endpoints

### One-to-One Relationships

#### `GET /demo/relationships/user/:userId/lead-profile`
- **Description**: Get user with lead profile (One-to-One)
- **Example**: `GET /demo/relationships/user/123e4567-e89b-12d3-a456-426614174000/lead-profile`
- **Returns**: User object with `leadProfile` (single object or null)

#### `GET /demo/relationships/lead/:leadId/user`
- **Description**: Get lead profile with user (One-to-One reverse)
- **Example**: `GET /demo/relationships/lead/123e4567-e89b-12d3-a456-426614174000/user`
- **Returns**: Lead profile with `user` (always exists)

### One-to-Many Relationships (Returns Array)

#### `GET /demo/relationships/lead/:leadId/preferred-programs`
- **Description**: Get lead with preferred programs (One-to-Many)
- **Example**: `GET /demo/relationships/lead/123e4567-e89b-12d3-a456-426614174000/preferred-programs`
- **Returns**: Lead with `preferredPrograms` array (can be empty `[]`)

#### `GET /demo/relationships/lead/:leadId/all-relations`
- **Description**: Get lead with all One-to-Many relationships
- **Example**: `GET /demo/relationships/lead/123e4567-e89b-12d3-a456-426614174000/all-relations`
- **Returns**: Lead with all arrays:
  - `preferredCountries[]`
  - `preferredPrograms[]`
  - `academicResults[]`
  - `englishTestResults[]`

### Many-to-One Relationships

#### `GET /demo/relationships/preferred-country/:prefCountryId/country`
- **Description**: Get preferred country with country (Many-to-One)
- **Example**: `GET /demo/relationships/preferred-country/123e4567-e89b-12d3-a456-426614174000/country`
- **Returns**: Preferred country with `country` (single object)

#### `GET /demo/relationships/university/:uniId/location`
- **Description**: Get university with location (Multiple Many-to-One)
- **Example**: `GET /demo/relationships/university/123e4567-e89b-12d3-a456-426614174000/location`
- **Returns**: University with `country`, `state`, `city` (all single objects)

### Nested Relationships

#### `GET /demo/relationships/user/:userId/nested`
- **Description**: Get user with deeply nested relationships
- **Example**: `GET /demo/relationships/user/123e4567-e89b-12d3-a456-426614174000/nested`
- **Returns**: User with nested navigation: `user.leadProfile.preferredPrograms[0].programme.name`

### Query Examples

#### `GET /demo/relationships/leads/by-country/:countryId`
- **Description**: Query leads by preferred country (relationship condition)
- **Example**: `GET /demo/relationships/leads/by-country/123e4567-e89b-12d3-a456-426614174000`
- **Returns**: Array of leads who prefer this country

#### `GET /demo/relationships/universities/by-country/:countryId`
- **Description**: Query universities by country (nested relationship condition)
- **Example**: `GET /demo/relationships/universities/by-country/123e4567-e89b-12d3-a456-426614174000`
- **Returns**: Array of universities in this country

### Complete Example

#### `GET /demo/relationships/user/:userId/complete`
- **Description**: Complete example showing all relationship types
- **Example**: `GET /demo/relationships/user/123e4567-e89b-12d3-a456-426614174000/complete`
- **Returns**: Full demonstration of One-to-One, One-to-Many (array), and Many-to-One

## Testing Steps

1. **Seed your database** (if not already done):
   ```bash
   npm run seed
   ```

2. **Get a user ID** from your database:
   ```sql
   SELECT id FROM "sys_Users" LIMIT 1;
   ```

3. **Test One-to-One**:
   ```
   GET /demo/relationships/user/{userId}/lead-profile
   ```

4. **Test One-to-Many (Array)**:
   ```
   GET /demo/relationships/lead/{leadId}/preferred-programs
   ```

5. **Test Many-to-One**:
   ```
   GET /demo/relationships/preferred-country/{prefCountryId}/country
   ```

6. **Test Complete Example**:
   ```
   GET /demo/relationships/user/{userId}/complete
   ```

## Console Logging

All relationship access is automatically logged. Check your console for:
- `Demo: Getting user with lead profile (One-to-One)`
- `Demo: Getting lead with preferred programs (One-to-Many)`
- `Demo: Getting preferred country with country (Many-to-One)`
- Relationship counts and details

## Response Examples

### One-to-One Response
```json
{
  "message": "One-to-One relationship: user.leadProfile",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "phone": "+1234567890",
    "leadProfile": {
      "id": "...",
      "fullName": "John Doe",
      "city": "New York"
    }
  }
}
```

### One-to-Many Response (Array)
```json
{
  "message": "One-to-Many relationship: lead.preferredPrograms (returns array)",
  "lead": {
    "id": "...",
    "fullName": "John Doe",
    "preferredPrograms": [
      {
        "id": "...",
        "programme": {
          "id": "...",
          "name": "Computer Science"
        }
      }
    ],
    "programCount": 1
  }
}
```

### Many-to-One Response
```json
{
  "message": "Many-to-One relationship: prefCountry.country",
  "preferredCountry": {
    "id": "...",
    "country": {
      "id": "...",
      "countryName": "United States"
    },
    "lead": {
      "id": "...",
      "fullName": "John Doe"
    }
  }
}
```

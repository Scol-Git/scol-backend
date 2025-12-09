## Registration

### POST <base-url>/auth/register
- body:
```typescript
{
  /**
   * Phone number (Bangladesh format: 11 digits starting with 01)
   * @example "01837917991"
   * 
   * - string
   * - not empty
   * - valid Bangladesh phone number (11 digits starting with 01)
   */
  phone!: string;

  /**
   * User password (minimum 8 characters, must contain uppercase, lowercase, number, and special character)
   * @example "SecureP@ss123"
   * 
   * - string
   * - not empty
   * - minimum 8 characters
   * - must contain uppercase, lowercase, number, and special character
   */
  password!: string;

  /**
   * Full name of the lead
   * @example "John Doe"
   * 
   * - string
   * - not empty
   * - minimum 2 characters
   * - maximum 255 characters
   */
  fullName!: string;
}
```
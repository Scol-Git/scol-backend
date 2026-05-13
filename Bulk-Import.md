
## Input/Output Folder
```
BulkImport
├── University
│   ├── Archive/
│   ├── Errors/
│   ├── Staging/
│   |   ├── uni_1.csv
```
- Archive: Contains the final processed Input CSV files with user input. (with timestamp in the filename)
- Errors: Contains the error files generated during the import process. (with timestamp in the filename)
- Staging: Contains the input CSV files that will be processed. (will be 1 file at a time, and will be deleted after processing)


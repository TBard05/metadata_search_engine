# metadata_search_engine

This repository contains the files for the Metadata Search Engine project.  
It has been set as a public repository to allow anyone to download the code locally and run it.  
The implementation is done in **Node.js** with **Express** and **MySQL** as the database.

## Description
This project demonstrates how to upload, manage, and search files based on their metadata.  
It evaluates knowledge in areas such as database queries, API route handling, and modular server design.  

The server supports searching by:
- Filename  
- Filetype  
- Metadata key/value pairs  
- Operators (`=`, `!=`, `<`, `>`)  
- Geographic search using latitude/longitude with radius filtering  

Weighted relevance scoring is used to rank results.

## Files in this Repository

- **server.js** – Main server entry point.  
- **db.js** – Database connection.  
- **routes/search.js** – Route file for metadata search queries.  
- **client/** –  frontend folder to build a UI.  
- **files/** – Directory containing uploaded/served files.  
- **extract/** – Folder for extractors (PDF, DOCX, image, audio metadata, etc.).  
- **audioHandler.js, docxHandler.js, imageHandler.js, pdfHandler.js** – Scripts for handling metadata extraction by file type.  
- **setupTables.js** – Script for initializing database tables.  
- **test-db.js** – Script for testing database connection.  
- **.env** – Environment configuration (database credentials, server port).  


## Install dependencies:  
 npm install
## Create a .env file in the root directory with the following contents:
DB_HOST=localhost
DB_PORT=####
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=metadata_db
PORT=3000
## Setupthe MySQL database.
## Start the server:
node server.js

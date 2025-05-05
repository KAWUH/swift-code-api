# SWIFT Code API Service

This application parses SWIFT code data from a CSV file, stores it in a PostgreSQL database, and exposes a RESTful API to query and manage the data. It is built using TypeScript, Node.js, Express, Prisma, and PostgreSQL, and is fully containerized using Docker.

## Features

*   Parses SWIFT code data from a provided CSV file (`data/swift_data.csv`).
*   Identifies headquarters and branches.
*   Stores SWIFT code details in a PostgreSQL database using Prisma ORM.
*   Provides RESTful API endpoints to:
    *   Retrieve details for a single SWIFT code (including branches if it's a headquarters).
    *   Retrieve all SWIFT codes for a specific country (by ISO2 code).
    *   Add new SWIFT code entries.
    *   Delete specific SWIFT code entries.
*   Includes input validation using Zod.
*   Containerized using Docker and Docker Compose for both development and testing environments.
*   Includes comprehensive unit and integration tests using Jest and Supertest.

## Technology Stack

*   **Backend:** Node.js, Express.js
*   **Language:** TypeScript
*   **Database:** PostgreSQL
*   **ORM:** Prisma
*   **Validation:** Zod
*   **Testing:** Jest, Supertest, `jest-mock-extended`
*   **Containerization:** Docker, Docker Compose

## Prerequisites

*   [Node.js](https://nodejs.org/) (v20 or later recommended)
*   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
*   [Docker](https://www.docker.com/products/docker-desktop/)
*   [Git](https://git-scm.com/)

## Setup Instructions

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/KAWUH/swift-code-api.git
    cd swift-code-api
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Environment Variables:**
    *   Create a `.env` file in the project root.
    *   This file is used by `docker-compose.yml` for the development database and potentially by the application if run outside Docker.
        ```dotenv
        # .env
        # PostgreSQL connection string (used by Prisma and the app if run locally)
        # Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
        # These values are typically overridden by docker-compose environment section for the 'app' service
        SWIFT_DB_URL="postgresql://user:password@db:5432/swift_codes_db?schema=public"

        # Server Port
        PORT=8080

        # Variables used by docker-compose.yml for the 'db' service
        POSTGRES_USER=user
        POSTGRES_PASSWORD=password
        POSTGRES_DB=swift_codes_db
        ```
    *   Create a `.env.test` file for the testing environment (ensure the database name and port are different from development):
        ```dotenv
        # .env.test
        # PostgreSQL connection string for the TEST database
        # Points to the port exposed by docker-compose.test.yml (e.g., 5432) or your manual test DB
        SWIFT_DB_URL="postgresql://user:password@localhost:5432/swift_codes_test_db?schema=public" # Adjust port if needed (e.g., 5433)

        # Server Port (optional for tests)
        PORT=8081
        ```

4.  **Generate Prisma Client:**
    Although Docker builds handle this, it's good practice locally:
    ```bash
    npx prisma generate
    ```

## Running the Application (Development)

This project uses Docker Compose to manage the application and development database containers.

1.  **Build and Start Containers:**
    This command builds the application image (if not already built) and starts the `app` and `db` services defined in `docker-compose.yml`.
    ```bash
    docker compose up --build -d
    ```
    *   `--build`: Forces a rebuild of the application image.
    *   `-d`: Runs containers in detached mode (background).

2.  **Apply Database Migrations:**
    The first time you run the database container, or whenever the schema changes, apply the migrations:
    ```bash
    # Execute inside the running 'app' container OR run locally if DB is accessible
    docker compose exec app npx prisma migrate dev --name init # Use a descriptive name
    ```
    *   *Note:* If you prefer running Prisma commands locally against the containerized DB, ensure the `SWIFT_DB_URL` in your local `.env` points correctly to the exposed database port (e.g., `localhost:5432`).

3.  **Access the Application:**
    The API should now be accessible at `http://localhost:8080`.

4.  **Stopping the Application:**
    ```bash
    docker compose down
    ```

## Seeding the Database (Optional)

The application includes a script to parse the `data/swift_data.csv` file and populate the database.

1.  **Ensure Application and DB are Running:** Use `docker compose up -d`.
2.  **Run the Seed Script:** Execute the script within the running `app` container:
    ```bash
    docker compose exec app npx prisma db seed
    ```
    *   This uses the `prisma.seed` script defined in `package.json`, which runs `src/scripts/parseAndSeed.ts`.
    *   The script uses `upsert` and is safe to run multiple times.

## Running Tests

The project includes unit tests (mocking dependencies) and integration tests (running against a real test database).

1.  **Start the Test Database:**
    Use the separate Docker Compose file for the test database. **Important:** Ensure your development database container (from `docker-compose.yml`) is stopped to avoid port conflicts on `5432`.
    ```bash
    # Ensure development environment is stopped
    docker compose down

    # Start the test database container defined in docker-compose.test.yml
    docker compose -f docker-compose.test.yml up -d
    ```
    *   Make sure the `SWIFT_DB_URL` in `.env.test` points to the correct host and port (`localhost:5432` by default, as configured in `docker-compose.test.yml`).
    *   *(Optional: If you need to run both dev and test DBs simultaneously, modify `docker-compose.test.yml` to expose a different host port, e.g., `5433:5432`, and update `SWIFT_DB_URL` in `.env.test` accordingly.)*

2.  **Run Tests:**
    Execute the test script defined in `package.json`. This command uses `dotenv-cli` to load `.env.test` and runs Jest.
    ```bash
    npm test
    ```
    *   The integration tests (`swiftApi.integration.test.ts`) include a `beforeAll` hook that automatically runs `prisma migrate reset --force` against the test database specified in `.env.test`, ensuring a clean schema for each test suite run.

3.  **Stop the Test Database:**
    When finished testing:
    ```bash
    docker compose -f docker-compose.test.yml down
    ```

## API Endpoints

The API is available under the `/v1/swift-codes` base path.

---

### 1. Retrieve Single SWIFT Code Details

*   **Endpoint:** `GET /v1/swift-codes/{swift-code}`
*   **Description:** Retrieves details for a specific SWIFT code. If the code represents a headquarters (`XXX` suffix), its associated branches (sharing the first 8 characters) are also included.
*   **URL Params:**
    *   `swift-code` (string, required): The SWIFT code to retrieve (case-insensitive).
*   **Success Response (200 OK):**
    *   *For Headquarters:*
        ```json
        {
          "address": "123 Main St",
          "bankName": "Test Bank HQ",
          "countryISO2": "US",
          "countryName": "UNITED STATES",
          "isHeadquarter": true,
          "swiftCode": "BANKUSNYXXX",
          "branches": [
            {
              "address": "456 Side St",
              "bankName": "Test Bank Branch 1",
              "countryISO2": "US",
              "isHeadquarter": false,
              "swiftCode": "BANKUSNY123"
            },
            {
              "address": "789 Other St",
              "bankName": "Test Bank Branch 2",
              "countryISO2": "US",
              "isHeadquarter": false,
              "swiftCode": "BANKUSNY456"
            }
          ]
        }
        ```
    *   *For Branch:*
        ```json
        {
          "address": "456 Side St",
          "bankName": "Test Bank Branch 1",
          "countryISO2": "US",
          "countryName": "UNITED STATES",
          "isHeadquarter": false,
          "swiftCode": "BANKUSNY123"
        }
        ```
*   **Error Responses:**
    *   `400 Bad Request`: If the `swift-code` parameter is missing.
    *   `404 Not Found`: If the specified SWIFT code does not exist.
    *   `500 Internal Server Error`: For unexpected server errors.

---

### 2. Retrieve SWIFT Codes by Country

*   **Endpoint:** `GET /v1/swift-codes/country/{countryISO2code}`
*   **Description:** Retrieves all SWIFT codes (both headquarters and branches) for a specific country.
*   **URL Params:**
    *   `countryISO2code` (string, required): The 2-letter ISO 3166-1 alpha-2 country code (case-insensitive).
*   **Success Response (200 OK):**
    ```json
    {
      "countryISO2": "US",
      "countryName": "UNITED STATES",
      "swiftCodes": [
        {
          "address": "456 Side St",
          "bankName": "Test Bank Branch 1",
          "countryISO2": "US",
          "isHeadquarter": false,
          "swiftCode": "BANKUSNY123"
        },
        {
          "address": "789 Other St",
          "bankName": "Test Bank Branch 2",
          "countryISO2": "US",
          "isHeadquarter": false,
          "swiftCode": "BANKUSNY456"
        },
        {
          "address": "123 Main St",
          "bankName": "Test Bank HQ",
          "countryISO2": "US",
          "isHeadquarter": true,
          "swiftCode": "BANKUSNYXXX"
        }
      ]
    }
    ```
    *   If no codes are found for the country, `swiftCodes` will be an empty array and `countryName` might indicate "Country Not Found".
*   **Error Responses:**
    *   `400 Bad Request`: If the `countryISO2code` parameter is missing or not a 2-letter string.
    *   `500 Internal Server Error`: For unexpected server errors.

---

### 3. Add New SWIFT Code

*   **Endpoint:** `POST /v1/swift-codes`
*   **Description:** Adds a new SWIFT code entry to the database.
*   **Request Body (JSON):**
    ```json
    {
      "swiftCode": "NEWCODEGBXXX", // 8 or 11 chars, specific format
      "bankName": "New Bank PLC",
      "address": "1 New Street", // Optional
      "countryISO2": "GB", // 2 uppercase letters
      "countryName": "United Kingdom", // Will be stored uppercase
      "isHeadquarter": true // Boolean
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "message": "SWIFT code NEWCODEGBXXX created successfully."
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: If the request body fails validation (missing fields, incorrect formats - details provided).
    *   `409 Conflict`: If a SWIFT code with the same `swiftCode` already exists.
    *   `500 Internal Server Error`: For unexpected server errors.

---

### 4. Delete SWIFT Code

*   **Endpoint:** `DELETE /v1/swift-codes/{swift-code}`
*   **Description:** Deletes a specific SWIFT code entry from the database.
*   **URL Params:**
    *   `swift-code` (string, required): The SWIFT code to delete (case-insensitive).
*   **Success Response (200 OK):**
    ```json
    {
      "message": "SWIFT code BANKUSNY123 deleted successfully."
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: If the `swift-code` parameter is missing.
    *   `404 Not Found`: If the specified SWIFT code does not exist to be deleted.
    *   `500 Internal Server Error`: For unexpected server errors.

---

## Project Structure

```
.
├── data/
│   └── swift_data.csv          # Source data file
├── prisma/
│   ├── migrations/             # Database migration history
│   │   └── ...                 # Migration folders
│   └── schema.prisma           # Database schema definition
├── src/
│   ├── controllers/            # Request handlers (Express route logic)
│   │   └── swiftCodeController.ts
│   ├── routes/                 # API route definitions
│   │   └── swiftCodeRoutes.ts
│   ├── scripts/                # Standalone scripts (e.g., seeding)
│   │   └── parseAndSeed.ts
│   ├── services/               # Business logic layer
│   │   └── swiftCodeService.ts
│   ├── utils/                  # Utility functions (e.g., Prisma client instance)
│   │   └── prismaClient.ts
│   ├── validation/             # Input validation schemas (Zod)
│   │   └── swiftCodeSchemas.ts
│   └── server.ts               # Express server setup and startup
├── tests/
│   ├── integration/            # Integration tests (API level)
│   │   └── swiftApi.integration.test.ts
│   ├── unit/                   # Unit tests (service level)
│   │   └── swiftCodeService.test.ts
│   └── utils/                  # Test utilities (e.g., Prisma mock)
│       └── prismaMock.ts
├── .env                        # Environment variables for development
├── .env.test                   # Environment variables for testing
├── .gitignore
├── docker-compose.yml          # Docker Compose for development
├── docker-compose.test.yml     # Docker Compose for test database
├── Dockerfile                  # Application Dockerfile 
├── jest.config.js              # Jest configuration
├── package-lock.json           # Exact dependency versions
├── package.json                # Project metadata and dependencies
├── README.md                   # This file
└── tsconfig.json               # TypeScript configuration
```

## Environment Variables

*   `SWIFT_DB_URL`: PostgreSQL connection string used by Prisma.
*   `PORT`: Port the Express server listens on (defaults to 8080).
*   `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: Used by Docker Compose to initialize the PostgreSQL containers.

## Docker Usage

*   **Development:** `docker-compose.yml` defines the `app` service (built using `Dockerfile`) and the `db` service (PostgreSQL). The app connects to the `db` service using the hostname `db`. The API is exposed on `localhost:8080`.
*   **Testing:** `docker-compose.test.yml` defines a separate `db_test` service (PostgreSQL) exposed on `localhost:5432` (requires the development `db` service to be stopped). Tests run locally connect to this test database instance via the connection string in `.env.test`. See the "Running Tests" section for details and alternatives.
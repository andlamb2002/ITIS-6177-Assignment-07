const express = require('express');
const axios = require('axios');
const app = express();
const port = 3001;

const FUNCTION_URL = "https://assingment-07-function.azurewebsites.net/api/sayFunction";

app.get('/say', async (req, res) => { // Route to call Azure Say Function
    const keyword = req.query.keyword || "";
    try {
        const response = await axios.get(`${FUNCTION_URL}?keyword=${keyword}`);
        res.json(response.data);
    } catch (error) {
        console.error("Error calling Azure Say Function:", error);
        res.status(500).json({ error: "Failed to fetch response from Azure Function" });
    }
});

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');

const options = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Assignment 6 API',
            version: '1.0.0',
            description: 'REST-like API with Swagger',
        },
        host: 'localhost:3001',
        basePath: '/',
    },
    apis: ['./server.js'],
};

const specs = swaggerJsdoc(options);

app.use(express.json());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));
app.use(cors());

const mariadb = require('mariadb');
const pool = mariadb.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'sample',
    port: 3306,
    connectionLimit: 5
});

async function runQuery(sql, params) { // Query helper function
    let conn;
    try {
        conn = await pool.getConnection();
        const results = await conn.query(sql, params); 
        return results;
    } catch (err) {
        console.error(err);
        throw err;
    } finally {
        if (conn) conn.end(); 
    }
}

/**
 * @swagger
 * /customers:
 *   get:
 *     summary: Fetches all customers
 *     responses:
 *       200:
 *         description: Success
 *       500:
 *         description: Error with fetching customers
 */
app.get('/customers', async (req, res) => { 
    try {
        const results = await runQuery('SELECT * FROM customer');
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Error with fetching customers' });
    }
});

/**
 * @swagger
 * /customers/{code}:
 *   get:
 *     summary: Fetches specific customer by code
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: The customer code
 *     responses:
 *       200:
 *         description: Success
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Error with fetching customer by code
 */
app.get('/customers/:code', async (req, res) => { 
    const { code } = req.params;
    try {
        const results = await runQuery('SELECT * FROM customer WHERE CUST_CODE = ?', [code]);
        if (results.length) {
            res.json(results[0]);
        } else {
            res.status(404).send({ error: 'Customer not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Error with fetching customer by code' });
    }
});

/**
 * @swagger
 * /agents:
 *   get:
 *     summary: Fetches all agents and their customers
 *     responses:
 *       200:
 *         description: Success
 *       500:
 *         description: Error with fetching agents with their customers
 */
app.get('/agents', async (req, res) => {
    try {
        const sql = `
            SELECT 
                a.AGENT_CODE, a.AGENT_NAME, a.WORKING_AREA, a.PHONE_NO AS AGENT_PHONE, a.COMMISSION, a.COUNTRY,
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'CUST_CODE', c.CUST_CODE,
                        'CUST_NAME', c.CUST_NAME
                    )
                ) AS CUSTOMERS
            FROM agents a
            LEFT JOIN customer c ON a.AGENT_CODE = c.AGENT_CODE
            GROUP BY a.AGENT_CODE;
        `;
        const results = await runQuery(sql);
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Error with fetching agents with their customers' });
    }
});

/**
 * @swagger
 * /students:
 *   get:
 *     summary: Fetches all students and their reports
 *     responses:
 *       200:
 *         description: Success
 *       500:
 *         description: Error with fetching students with their reports
 */
app.get('/students', async (req, res) => {
    try {
        const sql = `
            SELECT 
                s.NAME, s.TITLE, s.CLASS, s.SECTION, s.ROLLID,
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'GRADE', sr.GRADE,
                        'SEMISTER', sr.SEMISTER,
                        'CLASS_ATTENDED', sr.CLASS_ATTENDED
                    )
                ) AS REPORTS
            FROM student s
            LEFT JOIN studentreport sr ON s.CLASS = sr.CLASS AND s.SECTION = sr.SECTION AND s.ROLLID = sr.ROLLID
            GROUP BY s.CLASS, s.SECTION, s.ROLLID;
        `;
        const results = await runQuery(sql);
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Error with fetching students with their reports' });
    }
});

/**
 * @swagger
 * /foods:
 *   get:
 *     summary: Fetches all food items
 *     responses:
 *       200:
 *         description: Success
 *       500:
 *         description: Error with fetching foods
 */
app.get('/foods', async (req, res) => {
    const query = `SELECT * FROM foods;`;
    try {
        const results = await runQuery(query);
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Failed to fetch foods' });
    }
});

/**
 * @swagger
 * /foods/{ITEM_ID}:
 *   get:
 *     summary: Fetches specific food item by ITEM_ID
 *     parameters:
 *       - in: path
 *         name: ITEM_ID
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of food item
 *     responses:
 *       200:
 *         description: Success
 *       404:
 *         description: Food was not found
 *       500:
 *         description: Failed to fetch the food item
 */
app.get('/foods/:ITEM_ID', async (req, res) => {
    const { ITEM_ID } = req.params;
    const query = `SELECT * FROM foods WHERE ITEM_ID = ?;`;

    try {
        const results = await runQuery(query, [ITEM_ID]);
        if (results.length > 0) {
            res.json(results[0]); 
        } else {
            res.status(404).send({ error: 'Food was not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Failed to fetch the food item' });
    }
});

/**
 * @swagger
 * /foods/addFood:
 *   post:
 *     summary: Creates a new food item
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ITEM_ID
 *               - ITEM_NAME
 *               - ITEM_UNIT
 *               - COMPANY_ID
 *             properties:
 *               ITEM_ID:
 *                 type: string
 *                 example: '8'
 *               ITEM_NAME:
 *                 type: string
 *                 example: 'Food'
 *               ITEM_UNIT:
 *                 type: string
 *                 example: 'Abc'
 *               COMPANY_ID:
 *                 type: string
 *                 example: '20'
 *     responses:
 *       201:
 *         description: Food item created successfully
 *       500:
 *         description: Server error
 */
app.post('/foods/addFood', async (req, res) => {
    const { ITEM_ID, ITEM_NAME, ITEM_UNIT, COMPANY_ID } = req.body;
    const insertQuery = `
        INSERT INTO foods (ITEM_ID, ITEM_NAME, ITEM_UNIT, COMPANY_ID)
        VALUES (?, ?, ?, ?);
    `;
    try {
        await runQuery(insertQuery, [ITEM_ID, ITEM_NAME, ITEM_UNIT, COMPANY_ID]);
        res.status(201).send({ message: 'Food item created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Failed to create the food item' });
    }
});

/**
 * @swagger
 * /foods/patchFood/{ITEM_ID}:
 *   patch:
 *     summary: Patches a specific food item
 *     parameters:
 *       - in: path
 *         name: ITEM_ID
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of food item to patch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ITEM_NAME:
 *                 type: string
 *                 example: 'Food1'
 *               ITEM_UNIT:
 *                 type: string
 *                 example: 'Abd'
 *               COMPANY_ID:
 *                 type: string
 *                 example: '21'
 *     responses:
 *       200:
 *         description: Food item updated successfully
 *       404:
 *         description: Food item not found
 *       500:
 *         description: Server error
 */
app.patch('/foods/patchFood/:ITEM_ID', async (req, res) => {
    const { ITEM_ID } = req.params;
    const { ITEM_NAME, ITEM_UNIT, COMPANY_ID } = req.body;

    const updates = [];
    const values = [];
    if (ITEM_NAME) {
        updates.push('ITEM_NAME = ?');
        values.push(ITEM_NAME);
    }
    if (ITEM_UNIT) {
        updates.push('ITEM_UNIT = ?');
        values.push(ITEM_UNIT);
    }
    if (COMPANY_ID) {
        updates.push('COMPANY_ID = ?');
        values.push(COMPANY_ID);
    }
    if (updates.length === 0) {
        res.status(400).send({ error: 'No updates provided' });
        return;
    }
    values.push(ITEM_ID);

    const updateQuery = `
        UPDATE foods
        SET ${updates.join(', ')}
        WHERE ITEM_ID = ?;
    `;

    try {
        const result = await runQuery(updateQuery, values);
        if (result.affectedRows) {
            res.send({ message: 'Food item updated successfully' });
        } else {
            res.status(404).send({ error: 'Food item not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Failed to update the food item' });
    }
});

/**
 * @swagger
 * /foods/putFood/{ITEM_ID}:
 *   put:
 *     summary: Updates a specific food item
 *     parameters:
 *       - in: path
 *         name: ITEM_ID
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the food item to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ITEM_NAME
 *               - ITEM_UNIT
 *               - COMPANY_ID
 *             properties:
 *               ITEM_NAME:
 *                 type: string
 *                 example: 'Food2'
 *               ITEM_UNIT:
 *                 type: string
 *                 example: 'Abe'
 *               COMPANY_ID:
 *                 type: string
 *                 example: '22'
 *     responses:
 *       200:
 *         description: Food item updated successfully
 *       404:
 *         description: Food item not found
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
app.put('/foods/putFood/:ITEM_ID', async (req, res) => {
    const { ITEM_ID } = req.params;
    const { ITEM_NAME, ITEM_UNIT, COMPANY_ID } = req.body;

    if (!ITEM_NAME || !ITEM_UNIT || !COMPANY_ID) {
        res.status(400).send({ error: 'All fields must be provided' });
        return;
    }

    const updateQuery = `
        UPDATE foods
        SET ITEM_NAME = ?, ITEM_UNIT = ?, COMPANY_ID = ?
        WHERE ITEM_ID = ?;
    `;

    try {
        const result = await runQuery(updateQuery, [ITEM_NAME, ITEM_UNIT, COMPANY_ID, ITEM_ID]);
        if (result.affectedRows) {
            res.send({ message: 'Food item updated successfully' });
        } else {
            res.status(404).send({ error: 'Food item not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Failed to update the food item' });
    }
});

/**
 * @swagger
 * /foods/deleteFood/{ITEM_ID}:
 *   delete:
 *     summary: Deletes a specific food item
 *     parameters:
 *       - in: path
 *         name: ITEM_ID
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the food item to delete
 *     responses:
 *       200:
 *         description: Food item deleted successfully
 *       404:
 *         description: Food item not found
 *       500:
 *         description: Server error
 */
app.delete('/foods/deleteFood/:ITEM_ID', async (req, res) => {
    const { ITEM_ID } = req.params;

    const deleteQuery = `
        DELETE FROM foods
        WHERE ITEM_ID = ?;
    `;

    try {
        const result = await runQuery(deleteQuery, [ITEM_ID]);
        if (result.affectedRows > 0) {
            res.send({ message: 'Food item deleted successfully' });
        } else {
            res.status(404).send({ error: 'Food item not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Failed to delete the food item' });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
const express = require('express');
const { v4: uuidV4 } = require('uuid');

const app = express();
app.use(express.json());

const customers = [];

const accountByCPF = function (req, res, next) {
    const { cpf } = req.headers;
    const customer = customers.find(customer => customer.cpf === cpf);

    if(!customer) {
        return res.status(400).json({ message: "Customer don't exist"});
    }

    req.customer = customer;
    next();
};

const getBalance = function (statement) {
    const balance = statement.reduce((acc, operation) => {
        if(operation.type=== "CREDIT") {
            return acc += operation.amount;
        } else {
            return acc -= operation.amount;
        }
    }, 0);

    return balance;
};

const validateDate = function (date) {
    const dateReg = /[0-9]{2}[/][0-9]{2}[/][0-9]{4}$/;
    const validDate = Array.isArray(date.match(dateReg));

    return validDate;
}

app.post('/account', (req, res)=>{
    const { cpf, name } = req.body;

    const customerAlreadyExist = customers.some(customer=> customer.cpf  === cpf)

    if(customerAlreadyExist) {
        return res.status(401).json({message: "There's a customer already in database with this CPF"});
    }

    const id = uuidV4();

    customers.push({
        id,
        cpf,
        name,
        statement: []
    })
    res.sendStatus(201);
});

app.use(accountByCPF);

app.get('/statement', (req, res)=>{
    const { statement } = req.customer;
    return res.json(statement);

});

app.post('/deposit', (req, res)=>{
    const { description, amount } = req.body;

    const statement = {
        description,
        amount,
        created_at: new Date(),
        type: "CREDIT"
    }

    req.customer.statement.push(statement);

    res.sendStatus(201);

});

app.post('/withdraw', (req, res)=>{
    const { amount } = req.body;

    const balance = getBalance(req.customer.statement);

    if(amount>balance) {
        return res.status(401).json({ message: "Insufficient founds"});
    }

    const statement = {
        amount,
        created_at: new Date(),
        type: "DEBIT"
    }
    req.customer.statement.push(statement);

    res.sendStatus(201);
});


app.get('/statement/date', (req, res)=>{
    const { date } = req.body;
    const { statement } = req.customer;

    if(!validateDate(date)) {
        return res.json({ message: "Invalid date"}).status(401);
    }

    const arrDate = date.split('/');
    const dateFilter = new Date(arrDate[2], arrDate[1]-1, arrDate[0]);

    const statementDateFilter = [];

    statement.filter(operation => {
        if(dateFilter <= operation.created_at) {
            statementDateFilter.push(operation);
        }
    })

    return res.json(statementDateFilter);
});

app.put('/account', (req, res)=>{
    const { name } = req.body;
    const { customer } = req;
    customer.name = name;

    return res.sendStatus(201);
});

app.get('/account', (req, res)=>{
    const { customer } = req;

    return res.json(customer);
});

app.delete('/account', (req, res)=>{
    const { customer } = req;

    customers.splice(customers.indexOf(customer), 1);
    res.json(customers).status(200);
});

app.get('/balance', (req, res)=>{
    const { customer } = req;

    const balance = getBalance(customer.statement);

    res.json(balance);
});

app.listen(3333, ()=>{
    console.log('Listening on port 3333');
});

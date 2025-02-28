module.exports = async function (context, req) {
    const keyword = req.query.keyword || "";
    context.res = {
        status: 200,
        body: `Andreas Lambropoulos says ${keyword}`
    };
};
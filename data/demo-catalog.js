// This is the only module allowed to expose prototype fixtures to runtime code.
// Production/cloud data is merged separately by the song repository.
module.exports = require("../utils/prototype-data");

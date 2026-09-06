const legacyGames = require('../services/legacy-games');

module.exports = {
    name: 'LegacyGameModal',
    command: legacyGames.handle,
    handle: legacyGames.handle
};

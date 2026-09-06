const legacyGames = require('../services/legacy-games');

module.exports = {
    name: 'LegacyGame',
    command: legacyGames.handle,
    handle: legacyGames.handle,
    customId: legacyGames.customId
};

var Database = require('./Database.js');
var Response = require('./Response.js');

var MESSAGE_REGEX = /\[(.*?)\]/g;

const KEYWORDS = [
    "Adapt", "Battlecry", "Charge", "Choose One", "Combo", "Counter", "Deathrattle", "Discover", "Divine Shield", "Enrage", "Freeze", "Immune", "Inspire", "Mega-Windfury", "Overload", "Poisonous", "Quest", "Reward", "Secret", "Silence", "Stealth", "Spell Damage \\+(\\d+)", "Taunt", "Windfury"  
];

const KEYWORDS_REGEX = new RegExp("(" + KEYWORDS.join("|") + ")", "gi");

var exports = module.exports = function WikiData(bot) {
    var self = this;
    var config = null;

    var database = null;

    var atkIcons = ["<:Stab:328542853338890240>", "<:Slash:328542852994957315>", "<:Crush:328542852600561664>", "<:Magic:328542852454023170>", "<:Ranged:328542852940431362>"];
    var otherIcons = ["<:Strength:328542853120786435>", "<:RangedStrength:328542852881711105>", "<:MagicStrength:328542852655087617>", "<:Prayer:328542852999151617>"];

    this.setup = function () {
        database = new Database(bot);

        bot.events.on('message', function (message) {
            var result = "";
            var results = [];

            while ((result = MESSAGE_REGEX.exec(message.content))) {
                results.push(result);
            }

            results = results.filter(function (value, index, self) {
                return self.indexOf(value) === index;
            });

            var response = new Response(bot, function (embed) {
                bot.sendMessage(message.channel, "", {
                    embed: embed
                });
            }, results.length);

            results.forEach(function (val) {
                var cardName = val[1];
                bot.log("Processing: " + cardName + " <" + message.guild.name + ":" + message.guild.id + ":" + message.author.username + ">");
                database.search(cardName, function (entry) {
                    var embed = bot.createEmbed();
                    if (entry.title && !entry.hero_power) {
                        embed.setAuthor(entry.title, "https://puu.sh/wuRse/6fdffde22a.png");
                        embed.setThumbnail(entry.image);

                        var heropower = entry.card_type && entry.card_type == "Hero Power";

                        var desc = "";
                        if (entry.mana_crystals) {
                            //desc += "<:mana:230133856987119616>`" + entry.mana_crystals + "`  ";
                            desc += "<:Mana:328953872464740352>`" + entry.mana_crystals + "`  ";
                        }
                        if (entry.attack && entry.health) {
                            //desc += "<:Attack:230132836974198786>`" + entry.attack + "`  <:Health:230132804799823872>`" + entry.health + "`";
                            desc += "<:Attack:328953872074932224>`" + entry.attack + "`  <:Health:328953873278697472>`" + entry.health + "`";
                        }

                        desc += "\n";
                        if (entry.card_type) desc += "**Type**: " + entry.card_type + "\n";
                        if (entry.class) desc += "**Class**: " + entry.class + "\n";
                        if (entry.rarity && !heropower) desc += "**Rarity**: " + entry.rarity + "\n";
                        if (entry.race && !heropower) desc += "**Race**: " + entry.race + "\n";
                        if (entry.abilities) desc += "\n*" + entry.abilities.replace(KEYWORDS_REGEX, "**$1**") + "*";

                        embed.setDescription(desc);

                        if (entry.rarity && !heropower) {
                            switch (entry.rarity) {
                            case "Legendary":
                                embed.setColor("#ffa500");
                                break;

                            case "Epic":
                                embed.setColor("#800080");
                                break;

                            case "Rare":
                                embed.setColor("#0b67e8");
                                break;

                            default:
                                embed.setColor("#ffffff");
                                break;
                            };
                        } else if (heropower) {
                            embed.setColor("#84421b");
                        } else {
                            embed.setColor("#ffffff");
                        }

                        response.handle(embed);
                    }
                });
            });
        });
    }
}
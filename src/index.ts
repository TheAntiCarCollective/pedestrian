import discord from "./services/discord";

// Install
import "./features";

discord.login().catch(console.error);

5th Nov 2026

Reassess visual style - it might be better and easier to have a large world if I opt for an animal-crossing/final fantasy 7 style - 3rd person, fixed camera angle, Fixed-Orientation Tracking Camera. That might let us have much larger outdoors and indoors spaces, many more characters and a more sandbox feel. However that must be traded off against the intended seriousness of the subject matter and intended dark(ish) art style - ie can we preserve that whilst simultaneously improving our development and world building potential?

Tech notes:

Logs. Every single possible event, player initiated or not, npc initiated, system initiated etc etc, needs to be logged, per play session, with absolute timestamps and time-since-session-start. Needs to have actor and actee (or other proper term) , plus everything that occurred in that action. Can be either info, warning, error or crash logs. use industry standard for this.

I would also want any ai actions to be logged, both input and output, and, preferably, any reasoning.

Make a debug agent skill to help with accessing all the logs, and tracing and fixing problems

Saved per session, but only keep the latest Session - we need some way to compact previous session logs. In fact even current session logs probably need rolling compaction after a certain time window.

I also want a debug mode where current state and info is displayed over targeted items. Also I should be able to pause, including ticks, and de-anchor so I can move around and inspect things.

Also save functionality and load functionality from a choice of multiple sessions.

World mechanics:

Change the "rival operatives" concept to "rival operatives from other spacefaring races" and we need to make sure that their effects propagate and interact with the players, the player being made aware of same through various direct and indirect ways

The concept of groundside funds, both legitimately gained via role and politics, and illegitimately gained via manufacture and insertion from orbit. Use of Illegitimate carries risk, both for discovery and also disrupting local economy, making it harder for players chosen civ to advance

A more or less clear and useful overview of the wider world, using news items, correspondence, overheard rumours, direct questioning, and ship abilities. Can be used to track the propagation of player effect throughout wider world, as well as, in certain emergencies or uses of abilities, to target non-visible areas eg to rain on advancing armies. Can also be used to glean clues as to potentially rival operatives. The players overview might be ablento be sabotaged/misled by rivals, and vice versa

The player needs to manage their own place in the world. An era-appropriate set of roles, each achievable via various internecine pathways, not necessarily guaranteed or on-rails either, the attainment of which has a large set of both unique and overlapping effects on the games mechanics. This should probably be left open to the concept of advancement, and things to acheive that, within a given role in the future - eg military officer rank, corporate rank etc. This provides access to legitimate funds for groundside operations.

An async "messaging" feature, with the appropriate mechanics of the age - letter writing with horse messengers, mechanised delivery, email (with attendant lag times) - to non-visible but fully interactive and core npcs, which can effect events out of sight, repercussions propagating back to visible world. We could put some time sensitive things in eg write to the pope to prevent the inquisitor from excommunicating another character etc etc. Remember correspondent may or may not do as player intended, based on base state and current live state that effects them. They may even produce an undesired result. This could be tied in with the concept of the player having an office or chambers as dictated by their role.

An "emergency state" mechanic, whereby non-related character traits are paused, and a new set of traits, reactions, rumors, and outcomes become live. User is warned of state, and in fact may have deliberately or indirectly made it happen - it is not necessarily a bad thing. But they must resolve emergency in one way or another before normal play resumes. Effects of outcomes are interpolated with normal play mechanics.

"Inertia weighting", or difficulty of influencing certain people or events, requiring more or less prior info, complicated actions etc etc, effected by various other factors too, like role, discovery risk/current state, etc etc

The assumption being it's easier to build in all these things earlier rather than later, but we really need to make sure these are added and managed in the most decoupled way possible so as not to make it hard to add/remove/modify

Take an example from the last section of brother assassin berserker book - Influence someone to become a religious martyr, but it must be done in the correct way, and no one of their followers must be persuaded to take their place, otherwise the character traits of the replacement are enshrined as virtuous, and they may not be compatible with uplifting the civ. The correct martyr values openness and inquisitiveness.
However, if the correct person is martyrd, then the established religion is at odds with those values, and so in the following ages a rift occurs which must be reconciled before a war occurs.

Speaking of wars, if any of the threads produces one, it can be taken advantage of in order to accelerate technological advance, but must be carefully managed in order not to escalate too far and either set civ back or destroy it. Ditto plagues, economic crises, social upheaval etc etc

I'd love to figure out a way to introduce a few long term, slow build, butterfly effect things, that the player slowly is made aware of, indirectly and obscurely at first, by some mechanism, and can choose to attempt to intercede at some point, with increasing "inertia weighting" the later they leave it - perhaps needing to use less subtle and thus more risky methods the further it goes.

An orbital ability to modify weather in certain ways. Could be to boost or damage crops, to effect troop or civilian movement, to reinforce religious points, or may have no effect whatsoever. If used too often or too obviously, should have quite high penalty.

Speaking of orbital mechanics, a basic orbital mechanics concept, so that certain abilities are unavailable when the ship is not above the place where it's needed - that should be viewable in same ui as the abilities.

All of the above, and their sub types, should be easily individually add/remove/update able in code

Put some sass/primness/character into the interactions with ship mind and drone, as per most of the culture novels. Similarly ensure we have attitude/character/individuality in all npcs

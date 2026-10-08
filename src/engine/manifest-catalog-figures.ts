// Named-figure catalog rows (SPEC §16.1). Each row carries exactly one
// `figure:<id>` tag; other tags bind the mantras and practices that name the
// figure, so the compiler can prefer the row when residue carries those ids.
// Prose is descriptive — iconography, role, Tang context — never doctrinal
// claims and never fabricated sayings. Pure data, like manifest-catalog.

import type { CatalogEntry } from './manifest-catalog';

/** The twelve core Tang figures, in figures.json5 order. */
export const FIGURE_IDS = [
  'figure:shakyamuni',
  'figure:amitabha',
  'figure:medicine-buddha',
  'figure:vairocana',
  'figure:maitreya',
  'figure:avalokiteshvara',
  'figure:manjushri',
  'figure:samantabhadra',
  'figure:ksitigarbha',
  'figure:mahasthamaprapta',
  'figure:nagarjuna',
  'figure:bodhidharma',
] as const;

export const FIGURE_PEOPLE: readonly CatalogEntry[] = [
  {
    name: 'Śākyamuni',
    one_liner:
      'He touches the bare earth when challenged, calling the common soil itself as witness.',
    subject: 'the teacher touching the earth',
    detail:
      'He walks the morning street with an earthen bowl, stopping wherever ordinary work is done. When doubts rise, he presses his right fingers into the common dust, refusing debate while the firm ground answers for him.',
    tags: ['figure:shakyamuni', 'teacher', 'historical'],
    templates: [
      {
        name: 'The one who stops at the low gate',
        detail:
          'He sits on the cold flags at the low gate and does not get up when anyone comes in, and the people at the gate stop talking while he is sitting there. The wicket swings behind him and nobody shuts it.',
        long_fire:
          ' He is not going to ask you for anything, and the gate is not going to close while he is there.',
        rare: ' He has been at that gate since before the lintel was cut, and the stone has worn where he sits.',
        tags: ['gate', 'step', 'threshold'],
        era: 'fantasy',
      },
      {
        one_liner: 'He walks the same lane every morning and stops wherever the work is.',
        detail:
          'He comes up the lane behind the people already at work and does not go around them, and the mason, who has seen him before, moves a hand-width along the wall to make room and goes on hammering.',
        tags: ['lane', 'mason', 'work'],
        long_fire:
          ' He stopped long enough for the stone dust to settle on his shoulders, and then he went on up the lane.',
        rare: ' He is the only teacher in the city who has ever turned up mud-footed.',
      },
      {
        one_liner: 'He walks the same lane every morning and stops wherever the work is.',
        detail:
          '{{hour}} he sits down on the step of a house he has never been inside, and the household goes on eating behind the curtain, and nobody hurries to see what he wants.',
        tags: ['step', 'household', 'curtain', 'morning', 'dusk', 'evening', 'night', 'hour'],
        long_fire:
          ' He sat there until the household stopped listening for him, which was the point of the step.',
        rare: ' He chose the step of a house that had not asked for him, and stayed past the meal.',
      },
      {
        one_liner: 'He walks the same lane every morning and stops wherever the work is.',
        detail:
          'When two men argue over a boundary, he puts his thumb in the dust between them and asks them both to look, and the argument ends because there is nothing in it that the ground does not already agree about.',
        tags: ['boundary', 'dispute', 'dust'],
        long_fire:
          ' They argued for the better part of an hour over a line that was under his thumb the whole time.',
        rare: ' He has never once been asked which of them was right, and has never said.',
      },
    ],
  },
  {
    name: 'Amitābha',
    one_liner: "He extends an open hand westward each dusk as the day's labor closes.",
    subject: 'the welcoming light of the west',
    detail:
      'At sundown when the market drum signals closing, his name passes among tired laborers packing their stalls. He leans outward from the western sky with an open palm, taking in every weary call without asking for credentials.',
    tags: ['figure:amitabha', 'mantra:nianfo', 'practice:tang/nianfo-recitation', 'western'],
    templates: [
      {
        name: 'The warmth in the amber mist',
        detail:
          'At dusk the mist over the twin fountains turns the colour of old honey, and anyone walking between the basins is warmer at the far end than at the near one. Nobody has measured it and everybody has noticed.',
        long_fire:
          ' The amber is thicker than it was, and the far basin is running warm enough to fog a window.',
        rare: ' He set the distance between the two basins himself, counting paces, so that a heart in a hurry could find its pace and stop.',
        tags: ['mist', 'fountain', 'amber'],
        era: 'fantasy',
      },
      {
        one_liner:
          'He leans out from the west with an open palm, and it is not the gesture you expect.',
        detail:
          '{{hour}} the western sky goes the colour of an unglazed bowl, and the men carrying the last of the day stop in the lane to watch it happen, and none of them say anything to each other about it.',
        tags: ['west', 'sky', 'lane', 'morning', 'dusk', 'evening', 'night', 'hour'],
        long_fire:
          ' He held it open after the lane emptied, which is when it stops being a sign and starts being a fact.',
        rare: ' The whole west bank of the city stopped work at the same moment, and nobody arranged it.',
      },
      {
        one_liner:
          'He leans out from the west with an open palm, and it is not the gesture you expect.',
        detail:
          'A woman asks him, on a night when the fever will not break, whether the west is far. He does not say no. He says the walking is the easy part, and sits down where he is.',
        tags: ['fever', 'night', 'sickbed'],
        long_fire:
          ' He sat with her until the cloth could be wrung out, and then he sat a while past that.',
        rare: ' He has never once told anyone the distance, and has never once been asked twice.',
      },
      {
        one_liner:
          'He leans out from the west with an open palm, and it is not the gesture you expect.',
        detail:
          'The ferrymen on the slow water keep a lamp on the far bank for him, and have done for four generations, and when the lamp is asked about they say it is cheaper than a search.',
        tags: ['ferry', 'lamp', 'water'],
        long_fire:
          ' They lit it again, and neither of the ferrymen mentioned that the last one was lit the night before.',
        rare: ' Four generations of ferrymen have lit it, and not one of them would say who told them to start.',
      },
    ],
  },
  {
    name: 'Bhaiṣajyaguru, the Medicine Buddha',
    one_liner: 'He offers bitter herbs and clean water to whoever is burning with fever.',
    subject: 'the healer with the medicine bowl',
    detail:
      'He sits beside the sickbed with an iron bowl of steeped myrobalan, cooling hot foreheads through the midnight watch. His twelve vows answer common aches directly, dispensing bitter draughts without asking what copper is in your purse.',
    tags: [
      'figure:medicine-buddha',
      'mantra:medicine-buddha',
      'practice:tang/medicine-rite',
      'healing',
    ],
    templates: [
      {
        name: 'The one who keeps the crock warm',
        detail:
          'He keeps the grey clay crock of bitter root in the hearth ashes, and the cork is loosened before anyone asks for it. The root is not medicine. It is for the people who come in unable to say what is wrong.',
        long_fire:
          ' The ash has held it warm since before the first arrivals, and the cup is out before the knocking stops.',
        rare: ' He has never once asked what a thing was for, and the crock is full anyway.',
        tags: ['crock', 'root', 'hearth'],
        era: 'fantasy',
      },
      {
        one_liner:
          'He brings the bitter draught to whoever is burning, and the price is not on the bowl.',
        detail:
          'He weighs the myrobalan in the market on his own small scale, and the herb-women have stopped arguing with his weights, and the reason they have stopped is that his scale is right.',
        tags: ['market', 'herbs', 'scale'],
        long_fire:
          ' He went back to the market the next day for the same measure, and the herb-women watched him do it.',
        rare: ' His scale is the only one on that row that has never once been doubted.',
      },
      {
        one_liner:
          'He brings the bitter draught to whoever is burning, and the price is not on the bowl.',
        detail:
          'Where the kiln is stoked, the men who work it get burnt hands most weeks. He sits where the ash is still warm and dresses the hands, and does not comment on what the kiln is for.',
        tags: ['kiln', 'burn', 'ash'],
        long_fire:
          ' He went back the next day to check the burns, and they had not opened, and he did not say so either.',
        rare: ' He has dressed the same four hands for nine years and never asked what they were making.',
      },
      {
        one_liner:
          'He brings the bitter draught to whoever is burning, and the price is not on the bowl.',
        detail:
          'He cools a forehand through a whole night with a wet cloth and a bowl of cold water, and at the fourth hour the cloth is put out warm instead of cold, which is how you know.',
        tags: ['sickbed', 'cloth', 'watch'],
        long_fire:
          ' He sat the whole watch through and did not move, and the household kept checking the cloth long after he had gone.',
        rare: ' He does the whole night, every night, and asks for nothing at the end of it.',
      },
    ],
  },
  {
    name: 'Vairocana',
    one_liner: 'He illuminates every rafter, loom, and dust mote without casting a single shadow.',
    subject: 'the primordial light at work',
    detail:
      "He turns his hands in the wisdom-fist, sending dawn through the courtyard tiles and kitchen smoke. Nothing is pushed aside; the cobbler's hammer and the abbot's bell catch the same unbroken brightness at the very same instant.",
    tags: ['figure:vairocana', 'cosmic', 'huayan'],
    era: 'tang',
    templates: [
      {
        name: 'The one who reads the light wrong',
        detail:
          'He sits where the slate roof of the Hall of Rolls throws its light across the trestles, and reading a roll out of that light is an effort. He reads them anyway, at the pace the paper wants, not the pace the court wants.',
        long_fire:
          ' The light off the slate moves across the trestles all morning, and he is still in the middle of the roll.',
        rare: ' There is no shadow on him at all in that hall, and the attendants stopped remarking on it a long time ago.',
        tags: ['light', 'rolls', 'hall'],
        era: 'fantasy',
      },
      {
        one_liner:
          'His light reaches the rafter and the dust in it at once, and nothing is pushed aside to make room.',
        detail:
          'In the foundry the smith works by a light that does not come off the coals. His hammer finds the mark on a dark face, and the sparks are the only thing in the room that casts a shadow.',
        tags: ['foundry', 'smith', 'fire'],
        long_fire:
          ' The light held the whole heat of the pour without shifting, and the shadow stayed on the wall the entire time.',
        rare: ' The smith never once had to shade his eyes, and he still turned his head away.',
      },
      {
        one_liner:
          'His light reaches the rafter and the dust in it at once, and nothing is pushed aside to make room.',
        detail:
          'At the loom the light comes through the heddle holes and lands on the cloth as it is woven, so the pattern is lit from the wrong side and the weaver sees the back of her own design.',
        tags: ['loom', 'cloth', 'weave'],
        long_fire:
          ' She worked a whole bolt without looking up, which she has never once managed in daylight.',
        rare: ' The pattern showed through the finished cloth for a week afterwards, and nobody dyed it out.',
      },
      {
        one_liner:
          'His light reaches the rafter and the dust in it at once, and nothing is pushed aside to make room.',
        detail:
          'At noon in midsummer, when the courtyard has one patch of shade and everyone is in it, the light comes in over the tiles and does not move the shade, and the people stay where they are because it is cooler there.',
        tags: ['courtyard', 'noon', 'shade'],
        long_fire: ' He stood over the whole courtyard at noon and not one thing in it shifted.',
        rare: ' On the day the shadow did not move, the whole household simply stayed where it was.',
      },
    ],
  },
  {
    name: 'Maitreya',
    one_liner: 'He sits with ankles crossed, leaning forward to watch the city wake.',
    subject: 'the coming teacher keeping watch',
    detail:
      "He rests his chin on two fingers, watching the carts roll through Chang'an's south gate. He has prepared his seat for centuries, yet his gaze stays fixed on muddy sandals and hurried footsteps, waiting for his hour to step down.",
    tags: ['figure:maitreya', 'future', 'patience'],
    era: 'tang',
    templates: [
      {
        name: 'The bench that is already made',
        detail:
          'The outer bench has a folded fleece cushion on it, and it is folded the same way every morning, and nobody is on it. People wait there anyway, because a seat that is always ready is easier to sit on than a person who might say no.',
        long_fire:
          ' The cushion has been soaked and dried enough times to give no cold, and it is folded the same way it always is.',
        rare: ' The bench has never once been occupied, and it has been sat on every day since the court was laid out.',
        tags: ['bench', 'wait', 'threshold'],
        era: 'fantasy',
      },
      {
        one_liner:
          'He watches the carts come through the south gate and has been ready for a very long time.',
        detail:
          'He keeps a seat that nobody is sitting in. It is swept. The tea beside it is cold, and it is cold because nobody drinks it, and it is still there at the end of the day.',
        tags: ['seat', 'tea', 'waiting'],
        long_fire:
          ' He swept the seat again after the last cart came through, which he does every day.',
        rare: ' The seat has been ready longer than anyone in the city has been alive.',
      },
      {
        one_liner:
          'He watches the carts come through the south gate and has been ready for a very long time.',
        detail:
          'At the crossroads where the three roads meet, a man stops to ask the way. Maitreya describes the turn exactly, at length, and the man thanks him and takes it.',
        tags: ['crossroads', 'traveller', 'direction'],
        long_fire: ' He described the turn for some time after the man had gone, and then stopped.',
        rare: ' The man came back a year later from the same crossing and asked the same question.',
      },
      {
        one_liner:
          'He watches the carts come through the south gate and has been ready for a very long time.',
        detail:
          'He watches a woman mend a torn sandal across the road from him and does not go over, and when she finishes and looks up he has already turned back to the gate.',
        tags: ['mending', 'sandal', 'gate'],
        long_fire: ' He did not go over. He has not gone over in a very long time.',
        rare: ' She mended the sandal and did not go over either, and neither of them mentioned it.',
      },
    ],
  },
  {
    name: 'Avalokiteśvara (Guanyin)',
    one_liner: 'She dips a willow branch in clean water and steps into the crowded lane.',
    subject: 'the hearer of cries stepping near',
    detail:
      'She walks directly toward shouting boatmen and frightened children, listening before anyone explains the trouble. With a flick of the damp willow she cools the heat of an argument, changing shape so easily that you mistake her for an aunt.',
    tags: [
      'figure:avalokiteshvara',
      'mantra:six-syllable',
      'practice:tang/six-syllable-recitation',
      'compassion',
      'guanyin',
    ],
    templates: [
      {
        name: 'The attendant on the cold flags',
        detail:
          'They sit on the cold flagstones beside whoever is coming apart, in coarse wet linen, and they do not recite anything. There is tea, and there is a steady hand on the shoulder, and that is the entire method.',
        long_fire:
          ' The linen is soaked through and they have not moved, and the tea they brought is still warm.',
        rare: ' They have never once told anybody what was wrong with them, and they have never needed to be asked either.',
        tags: ['flags', 'tears', 'attendant'],
        era: 'fantasy',
      },
      {
        one_liner:
          'She walks toward the shouting, and you mistake her for an aunt until she has already fixed it.',
        detail:
          'Two boatmen are shouting across the dock about a rope. She is at the bollard before either of them has decided to be angry about it, and the argument ends the way arguments end when someone turns up and is simply there.',
        tags: ['dock', 'boatmen', 'rope'],
        long_fire:
          ' She untied the knot that was the actual problem and left the two of them still arguing about the other one.',
        rare: ' Both boatmen will tell this differently and both will say she was closer than they were.',
      },
      {
        one_liner:
          'She walks toward the shouting, and you mistake her for an aunt until she has already fixed it.',
        detail:
          "{{hour}} she is outside a door where a child has been sent to fetch an adult, and the child is still standing there, and she is crouched down to the child's height and staying there until the door opens.",
        tags: ['child', 'door', 'crouched', 'morning', 'dusk', 'evening', 'night', 'hour'],
        long_fire:
          " She stayed at the child's height until the door opened, and the child did not move either.",
        rare: ' The child grew up in that house and always described a visitor, never a vision.',
      },
      {
        one_liner:
          'She walks toward the shouting, and you mistake her for an aunt until she has already fixed it.',
        detail:
          'A willow branch dipped in clean water cools an argument she never joins. She puts it down, wipes her hands on her apron, and goes back to where the shouting was, which has stopped.',
        tags: ['willow', 'water', 'apron'],
        long_fire: ' She cooled it and did not stay to be thanked, and was not thanked.',
        rare: ' She has broken up more arguments in this quarter than there are people who know it was her.',
      },
    ],
  },
  {
    name: 'Mañjuśrī (Wenshu)',
    one_liner: 'He raises a flaming blade to sever the tangled knot of your dispute.',
    subject: 'the sword cutting the knot',
    detail:
      'He rides down through northern pine groves on a roaring green lion, holding a palm-leaf scroll in his left hand. The bright blade does not strike flesh; it cleaves through stubborn evasions and muddled ledgers until only honest ground remains.',
    tags: ['figure:manjushri', 'wisdom', 'sword', 'wutai'],
    templates: [
      {
        name: 'The two words at the gate',
        detail:
          'He meets people at the low gate and gives them two words, and the two words are the right ones. He has been doing it long enough that newcomers ask for him by name, and he still takes exactly as long as it takes.',
        long_fire:
          ' The two words are short and they land, and the person at the gate is already walking differently.',
        rare: ' He gave the same two words to three people in a row last week and each of them needed those two words.',
        tags: ['words', 'gate', 'cord'],
        era: 'fantasy',
      },
      {
        one_liner: 'He brings down a blade that cuts the evasions, never the person holding them.',
        detail:
          'Two households have been four years in a court over a strip of field. He reads the case once and cuts the middle out of it with two words, and the four years are over, and the field is still there.',
        tags: ['court', 'field', 'dispute'],
        long_fire:
          ' He read the case once, which is less time than it took to hear the first argument.',
        rare: ' He has never once been the losing party in a case, and has never once said why.',
      },
      {
        one_liner: 'He brings down a blade that cuts the evasions, never the person holding them.',
        detail:
          'A child is given a knotted cord and told to find the end. He does not untie it. He shows the child where the second knot is holding the first, and the child works it out alone.',
        tags: ['child', 'knot', 'cord'],
        long_fire:
          ' He did not touch the cord. The child took the rest of the afternoon and did it without him.',
        rare: ' He has watched children work knots out all day and has not once reached in.',
      },
      {
        one_liner: 'He brings down a blade that cuts the evasions, never the person holding them.',
        detail:
          'On the northern slopes, where the pines go up into the cold, he rides a green lion and does not hurry. The people on the road know he is coming and get off it anyway.',
        tags: ['pine', 'mountain', 'road'],
        long_fire:
          ' He came down the whole northern slope and nobody on it was still standing when he passed.',
        rare: ' The pines on that ridge have never been cut, and the villagers are insistent that they were not saved by luck.',
      },
    ],
  },
  {
    name: 'Samantabhadra (Puxian)',
    one_liner: 'He urges his six-tusked mount along the rocky ditch to haul the wagon out.',
    subject: 'the heavy labor carried through',
    detail:
      'Where sharp words settle the law, he arrives with ropes and an unhurried white elephant to do the digging. He steps into the mud alongside laborers, steadying timber and testing bridge foundations until the promised road is truly built.',
    tags: ['figure:samantabhadra', 'practice', 'elephant'],
    templates: [
      {
        name: 'The one holding the embankment true',
        detail:
          'There is a post on the outer embankment that has to be held down, and he holds it. Nothing dramatic happens there. The storm comes and the post stays where it is, and the ditch does not move in.',
        long_fire:
          ' The post is holding and the bast has not gone, and the ditch is where it was laid.',
        rare: ' He has stood in that exact spot through gales that took the wicker screens and left the post untouched.',
        tags: ['embankment', 'post', 'bast'],
        era: 'fantasy',
      },
      {
        one_liner:
          'He turns up where the digging is and does the part nobody wants, and he is enormous.',
        detail:
          'A bridge has been named on a placard for two years and has no deck. He comes to the site with rope, and the placard is the same the next day, and something under it is different.',
        tags: ['bridge', 'rope', 'works'],
        long_fire:
          ' He worked the site until the deck was on, which took most of a season and most of him.',
        rare: ' He put the deck on. Nobody has ever seen him do anything else.',
      },
      {
        one_liner:
          'He turns up where the digging is and does the part nobody wants, and he is enormous.',
        detail:
          'The embankment keeps failing in the wet season. He wades into it during the flood and works it from inside, and the fix holds, and the whole village watches from the bank without helping.',
        tags: ['flood', 'embankment', 'mud'],
        long_fire:
          ' He was in the water for a day and a night, and the water was not survivable, and he was.',
        rare: ' The fix held through nine wet seasons, and every one of them was checked.',
      },
      {
        one_liner:
          'He turns up where the digging is and does the part nobody wants, and he is enormous.',
        detail:
          'He steadies a post while others lift, and when they set it down he is the one who is standing in the hole they dug, holding it true, waiting for the next timber.',
        tags: ['post', 'timber', 'lift'],
        long_fire:
          ' He held the post true for the better part of a day and nobody thought to relieve him.',
        rare: ' He has not once been asked to do the part that is easy.',
      },
    ],
  },
  {
    name: 'Kṣitigarbha (Dizang)',
    one_liner: 'He strikes the flagstones with his ringed staff, lighting the darkest pit.',
    subject: 'the staff ringing in the dark',
    detail:
      'He walks down into damp prisons and forgotten ditches where no candle is ever lit. His bronze rings chime against stone, shattering iron padlocks and guiding lost wanderers up the stairs by the glow of a warm jewel cupped in his palm.',
    tags: ['figure:ksitigarbha', 'vow', 'dizang'],
    templates: [
      {
        name: 'The one in the root cellar',
        detail:
          'He is down in the root cellars or wading in the thorny muck of the storm ditch, hauling out people who went in before they reached the gate. The staff he leans on is iron-shod, and it is not for walking.',
        long_fire:
          ' The staff is iron-shod and it is leaning, and he has been in the cold water longer than you have.',
        rare: ' He pulled four people out of the ditch in one night and the fifth was not alive to be pulled out.',
        tags: ['cellar', 'ditch', 'staff'],
        era: 'fantasy',
      },
      {
        one_liner:
          'He goes down where the candle does not reach, and he brings the light with him.',
        detail:
          'The mine has been given up as worked-out. He goes down the old shaft with a lamp that is not lit from oil, and the ring on his staff sounds on the stone the whole way, and the men at the top can hear when it stops.',
        tags: ['mine', 'shaft', 'staff'],
        long_fire:
          ' He was down there long enough that the men above stopped talking, and then the staff sounded again.',
        rare: ' He came up out of a mine that had been abandoned for thirty years.',
      },
      {
        one_liner:
          'He goes down where the candle does not reach, and he brings the light with him.',
        detail:
          'At the prison door the warders are courteous and unhelpful, which is the ordinary courtesy of a bad position. He stands there until the door is open, and then he goes in, and it is a long way down.',
        tags: ['prison', 'warder', 'door'],
        long_fire:
          ' He waited at the door for most of a night, and the warders were courteous the whole time.',
        rare: ' The door had been shut for a decade, and he opened it, and it is not said that he asked.',
      },
      {
        one_liner:
          'He goes down where the candle does not reach, and he brings the light with him.',
        detail:
          'He finds the ones who went down and did not come back up, and he does not bring them back. He brings the light down to where they are, which is a different job and takes longer.',
        tags: ['dark', 'lost', 'jewel'],
        long_fire:
          ' He got the light down to the bottom of the stair, which is the part nobody else would attempt.',
        rare: ' He has been found in pits that had been sealed longer than the towns above them existed.',
      },
    ],
  },
  {
    name: 'Mahāsthāmaprāpta (Dashizhi)',
    one_liner: 'He steps onto the firm road and the ground shivers with sudden courage.',
    subject: 'the surging stride of wisdom',
    detail:
      "He stands at Amitābha's right shoulder, but his stride belongs to active ground. When indecision paralyzes a workshop, his heavy footstep shakes the rafters, waking sluggish minds and filling timid hands with quiet, resolute strength.",
    tags: ['figure:mahasthamaprapta', 'wisdom', 'western'],
    templates: [
      {
        name: 'The one pace past the gate',
        detail:
          'He does not stop at the far bank, he stands one pace past it, which is close enough to be the last person you see from this side and far enough that he is not one of yours. That is the entire job and he has never once left it.',
        long_fire:
          ' He is a pace past the bank and he is not moving, and he has been not moving for some time.',
        rare: ' He has walked to the far bank a thousand times and has never once come back over it.',
        tags: ['bridge', 'wait', 'crossing'],
        era: 'fantasy',
      },
      {
        one_liner:
          'He stands on ground that is already firm, and it turns out to have been firm the whole time.',
        detail:
          'A workshop has stalled: the same joint, the same three people, the same morning for eleven days. He plants one foot outside the door, and the rafters move, and the joint gets cut before anyone has decided to cut it.',
        tags: ['workshop', 'stalled', 'rafters'],
        long_fire:
          ' He did it once and it was enough, and then he stood there while they finished.',
        rare: ' He has broken a stall exactly once, and never needed to do it again in the same workshop.',
      },
      {
        one_liner:
          'He stands on ground that is already firm, and it turns out to have been firm the whole time.',
        detail:
          'At a river crossing on a day the water is not crossingable, he is simply on the other side, and he has been there a while, and he waits for them rather than calling them across.',
        tags: ['river', 'crossing', 'water'],
        long_fire: ' He stood on the far bank the whole afternoon and never once called across.',
        rare: ' He has never told anyone how he crossed, and the ferrymen have stopped asking.',
      },
      {
        one_liner:
          'He stands on ground that is already firm, and it turns out to have been firm the whole time.',
        detail:
          'Someone is standing at a decision they have been standing at for months. He does not advise. He walks past at a pace that is slightly too fast, and the decision is made by the time he is at the end of the lane.',
        tags: ['decision', 'lane', 'pace'],
        long_fire: ' He walked the length of the lane and behind him the thing had been decided.',
        rare: ' He has never given an opinion and he has never been in a room where one was not needed.',
      },
    ],
  },
  {
    name: 'Nāgārjuna',
    one_liner: 'He sits in the courtyard taking apart rigid arguments like dry wicker.',
    subject: 'the dismantler of false claims',
    detail:
      'He leans over the stone bench with ink-stained fingers, showing that neither gain nor loss stands by itself. When disputants grow heated, he points to two rafters propping up the barn roof: each stands only because the other leans in.',
    tags: ['figure:nagarjuna', 'teacher', 'madhyamaka'],
    templates: [
      {
        name: 'The rafters of the low hall',
        detail:
          'He works on the low hall when it needs it. Two rafters came down in a gale and he and four others went up onto the wet beams and put them back, and he talks about it the way you talk about a fence post.',
        long_fire:
          ' The rafters are up and he is on the ground again, and the hall is being used as though nothing happened to it.',
        rare: ' He set two of the beams himself and would not say which, and nobody asked a second time.',
        tags: ['rafter', 'hail', 'repair'],
        era: 'fantasy',
      },
      {
        one_liner:
          'He takes a claim apart in front of you, slowly, until you can see that it was never joined.',
        detail:
          'Two brothers are arguing over the inheritance in the courtyard, and getting louder, and the roof of that courtyard is held up by two rafters leaning against each other. He points at them and neither brother speaks again for some time.',
        tags: ['brothers', 'courtyard', 'rafter'],
        long_fire: ' He pointed at the roof and left them to it, and they were quiet a long while.',
        rare: ' He has never once taken a side, and both sides send him their disputes anyway.',
      },
      {
        one_liner:
          'He takes a claim apart in front of you, slowly, until you can see that it was never joined.',
        detail:
          'A merchant arrives with a writ that says his claim is unchallengeable. He reads it, turns it over, and asks what would be true if the writ were false. The merchant thinks about it for a long time and leaves with it.',
        tags: ['merchant', 'writ', 'claim'],
        long_fire:
          ' He asked one question and did not ask a second, and the merchant was still thinking when he left.',
        rare: ' He has never lost an argument, because he has never had one.',
      },
      {
        one_liner:
          'He takes a claim apart in front of you, slowly, until you can see that it was never joined.',
        detail:
          'He sits on a stone bench with ink on his fingers and takes a strict claim apart so slowly that the people watching begin to unpick their own.',
        tags: ['bench', 'ink', 'claim'],
        long_fire: ' He took it apart over most of an afternoon and they stayed through all of it.',
        rare: ' Three people left that bench having withdrawn a claim they had come to make.',
      },
    ],
  },
  {
    name: 'Bodhidharma',
    one_liner: 'He sits wrapped in rough wool, ignoring flowery speech to point at the stone.',
    subject: 'the teacher facing the rock',
    detail:
      'He sits through freezing frost on Shaoshi mountain with his boots kicked off and his gaze pinned to bare rock. When clever scholars arrive with written treatises, he turns his head just enough to tell them to fetch firewood instead.',
    tags: ['figure:bodhidharma', 'chan', 'teacher'],
    templates: [
      {
        name: 'The man under the lee wall',
        detail:
          'He sits under the lee wall with his back to the wind, and the first thing he says to anyone who finds him is whether they have brought firewood. There is no gate for him and he does not go through it.',
        long_fire:
          ' The lee wall is warm on the inside from the sun and he is on the cold side of it, and he has firewood.',
        rare: ' He has not been on the other side of the wall in a long time, and the court has stopped remarking on it.',
        tags: ['wall', 'firewood', 'lee'],
        era: 'fantasy',
      },
      {
        one_liner: 'He faced the rock for nine years and the rock was the whole curriculum.',
        detail:
          'Through the freezing season he sits with his boots off and his face to bare stone, and the snow comes in through the gap in the wall and settles on him, and in the morning it is there under the ledge, undisturbed.',
        tags: ['snow', 'rock', 'winter'],
        long_fire:
          ' He sat until the snow under the ledge had a second layer over it, and neither was disturbed.',
        rare: ' He faced the same wall for nine years, and the wall is still there.',
      },
      {
        one_liner: 'He faced the rock for nine years and the rock was the whole curriculum.',
        detail:
          'Scholars arrive at the mountain with written treatises and roll them out on the rock. He turns his head enough to say that there is firewood to be brought, and goes back to facing the wall.',
        tags: ['scholars', 'treatise', 'firewood'],
        long_fire: ' He did not read a word of any of them, and the firewood did get brought.',
        rare: ' He has never read a treatise, and the ones brought up the mountain are still unopened.',
      },
      {
        one_liner: 'He faced the rock for nine years and the rock was the whole curriculum.',
        detail:
          "{{hour}} the students below the wall have been at it a long time, and he comes out and says the answer to the whole morning's difficulty in a form so plain that it sounds like a joke, and then he goes back in.",
        tags: ['students', 'morning', 'wall', 'morning', 'dusk', 'evening', 'night', 'hour'],
        long_fire:
          ' He came out once, said the whole thing, and went back in before anyone had understood it.',
        rare: ' The plain answer has not been understood since, and he has never offered another.',
      },
    ],
  },
];

export const FIGURE_PLACES: readonly CatalogEntry[] = [
  {
    name: 'Wutai Shan',
    one_liner: "The northern mountain revered as Mañjuśrī's seat.",
    subject: 'a mountain of wisdom',
    detail:
      'Pilgrims climb past terraces where the sword is said to have been seen. The cold is part of the teaching, the way the climb is part of the arrival.',
    tags: ['figure:manjushri', 'mountain', 'pilgrimage'],
  },
  {
    name: 'Jiuhua Shan',
    one_liner: "The southern mountain of Kṣitigarbha's great vow.",
    subject: 'a mountain of the vow',
    detail:
      'Mist, stone steps, and a bell that the visitor from Korea is said to have rung first. The ground holds the promise longer than the season.',
    tags: ['figure:ksitigarbha', 'mountain', 'vow'],
  },
];

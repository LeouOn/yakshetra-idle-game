"""Author person cards: 2-3 detail variants, a title variant, and both
qualifiers, for the 12 figure people and the 8 generic people.

WHY
Persons are the card players see most. b1's casual Tang data put them at 215 of
260 harvests, and Amitabha appeared twice in 30 cards with identical text while
Medicine Buddha appeared four times in the first 17. A named figure who does
something each time you meet them is the product; a named figure who is
re-served verbatim is a glossary entry (SPEC 11).

HOW THE VARIANTS GET CHOSEN
There is no hour field on a template, and inventing one is out of scope. What
exists is: the brief, the rarity gate, the flourish, the era. So each variant is
authored to be *recognisable from a brief* -- it carries its own tags and its own
distinctive nouns (the gate, the sickbed, the kiln), so a brief that mentions
that context scores that variant and the request picks the phrasing. The `{{hour}}`
slot still lands inside the sentence, so a variant that names a time of day
reads differently at the fourth hour than at dusk.

Each variant owns its own `long_fire` and `rare`. These are the same figure at
the market, the sickbed and the kiln -- the same person, so a shared sentence is
defensible -- but the *actions* are different, and a line about the market drum
attached to a card about a fever is a wrong sentence, not a shared voice.

WHAT THIS OVERWRITES
  src/engine/manifest-catalog-figures.ts  -- FIGURE_PEOPLE only
  src/engine/manifest-catalog.ts           -- the PEOPLE array only

SAFETY
  Refuses to run when either target has uncommitted changes, unless FORCE=1.
  Refuses to write a variant that is already present, so a second run is a
  no-op rather than a duplication.
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from write_guard import require_clean  # noqa: E402

FIGURES = Path('src/engine/manifest-catalog-figures.ts')
PEOPLE = Path('src/engine/manifest-catalog.ts')

# name -> (title variant, one_liner, [ (detail, tags, gate, long_fire, rare), ... ])
FIG = {
    'Śākyamuni': (
        'The one who stopped in the lane',
        'He walks the same lane every morning and stops wherever the work is.',
        [
            ('He comes up the lane behind the people already at work and does not go around them, and the mason, who has seen him before, moves a hand-width along the wall to make room and goes on hammering.',
             ['lane', 'mason', 'work'], 'none',
             ' He stopped long enough for the stone dust to settle on his shoulders, and then he went on up the lane.',
             ' He is the only teacher in the city who has ever turned up mud-footed.'),
            ('{{hour}} he sits down on the step of a house he has never been inside, and the household goes on eating behind the curtain, and nobody hurries to see what he wants.',
             ['step', 'household', 'curtain', 'morning', 'dusk', 'evening', 'night', 'hour'], 'none',
             ' He sat there until the household stopped listening for him, which was the point of the step.',
             ' He chose the step of a house that had not asked for him, and stayed past the meal.'),
            ('When two men argue over a boundary, he puts his thumb in the dust between them and asks them both to look, and the argument ends because there is nothing in it that the ground does not already agree about.',
             ['boundary', 'dispute', 'dust'], 'none',
             ' They argued for the better part of an hour over a line that was under his thumb the whole time.',
             ' He has never once been asked which of them was right, and has never said.'),
        ],
    ),
    'Amitābha': (
        'The hand that is already open',
        'He leans out from the west with an open palm, and it is not the gesture you expect.',
        [
            ('{{hour}} the western sky goes the colour of an unglazed bowl, and the men carrying the last of the day stop in the lane to watch it happen, and none of them say anything to each other about it.',
             ['west', 'sky', 'lane', 'morning', 'dusk', 'evening', 'night', 'hour'], 'none',
             ' He held it open after the lane emptied, which is when it stops being a sign and starts being a fact.',
             ' The whole west bank of the city stopped work at the same moment, and nobody arranged it.'),
            ('A woman asks him, on a night when the fever will not break, whether the west is far. He does not say no. He says the walking is the easy part, and sits down where he is.',
             ['fever', 'night', 'sickbed'], 'none',
             ' He sat with her until the cloth could be wrung out, and then he sat a while past that.',
             ' He has never once told anyone the distance, and has never once been asked twice.'),
            ('The ferrymen on the slow water keep a lamp on the far bank for him, and have done for four generations, and when the lamp is asked about they say it is cheaper than a search.',
             ['ferry', 'lamp', 'water'], 'none',
             ' They lit it again, and neither of the ferrymen mentioned that the last one was lit the night before.',
             ' Four generations of ferrymen have lit it, and not one of them would say who told them to start.'),
        ],
    ),
    'Bhaiṣajyaguru, the Medicine Buddha': (
        'The bitter cup, and who gets it',
        'He brings the bitter draught to whoever is burning, and the price is not on the bowl.',
        [
            ('He weighs the myrobalan in the market on his own small scale, and the herb-women have stopped arguing with his weights, and the reason they have stopped is that his scale is right.',
             ['market', 'herbs', 'scale'], 'none',
             ' He went back to the market the next day for the same measure, and the herb-women watched him do it.',
             ' His scale is the only one on that row that has never once been doubted.'),
            ('Where the kiln is stoked, the men who work it get burnt hands most weeks. He sits where the ash is still warm and dresses the hands, and does not comment on what the kiln is for.',
             ['kiln', 'burn', 'ash'], 'none',
             ' He went back the next day to check the burns, and they had not opened, and he did not say so either.',
             ' He has dressed the same four hands for nine years and never asked what they were making.'),
            ('He cools a forehand through a whole night with a wet cloth and a bowl of cold water, and at the fourth hour the cloth is put out warm instead of cold, which is how you know.',
             ['sickbed', 'cloth', 'watch'], 'none',
             ' He sat the whole watch through and did not move, and the household kept checking the cloth long after he had gone.',
             ' He does the whole night, every night, and asks for nothing at the end of it.'),
        ],
    ),
    'Vairocana': (
        'The lamp with no shadow',
        'His light reaches the rafter and the dust in it at once, and nothing is pushed aside to make room.',
        [
            ('In the foundry the smith works by a light that does not come off the coals. His hammer finds the mark on a dark face, and the sparks are the only thing in the room that casts a shadow.',
             ['foundry', 'smith', 'fire'], 'none',
             ' The light held the whole heat of the pour without shifting, and the shadow stayed on the wall the entire time.',
             ' The smith never once had to shade his eyes, and he still turned his head away.'),
            ('At the loom the light comes through the heddle holes and lands on the cloth as it is woven, so the pattern is lit from the wrong side and the weaver sees the back of her own design.',
             ['loom', 'cloth', 'weave'], 'none',
             ' She worked a whole bolt without looking up, which she has never once managed in daylight.',
             ' The pattern showed through the finished cloth for a week afterwards, and nobody dyed it out.'),
            ('At noon in midsummer, when the courtyard has one patch of shade and everyone is in it, the light comes in over the tiles and does not move the shade, and the people stay where they are because it is cooler there.',
             ['courtyard', 'noon', 'shade'], 'none',
             ' He stood over the whole courtyard at noon and not one thing in it shifted.',
             ' On the day the shadow did not move, the whole household simply stayed where it was.'),
        ],
    ),
    'Maitreya': (
        'The seat that is already made',
        'He watches the carts come through the south gate and has been ready for a very long time.',
        [
            ('He keeps a seat that nobody is sitting in. It is swept. The tea beside it is cold, and it is cold because nobody drinks it, and it is still there at the end of the day.',
             ['seat', 'tea', 'waiting'], 'none',
             ' He swept the seat again after the last cart came through, which he does every day.',
             ' The seat has been ready longer than anyone in the city has been alive.'),
            ('At the crossroads where the three roads meet, a man stops to ask the way. Maitreya describes the turn exactly, at length, and the man thanks him and takes it.',
             ['crossroads', 'traveller', 'direction'], 'none',
             ' He described the turn for some time after the man had gone, and then stopped.',
             ' The man came back a year later from the same crossing and asked the same question.'),
            ('He watches a woman mend a torn sandal across the road from him and does not go over, and when she finishes and looks up he has already turned back to the gate.',
             ['mending', 'sandal', 'gate'], 'none',
             ' He did not go over. He has not gone over in a very long time.',
             ' She mended the sandal and did not go over either, and neither of them mentioned it.'),
        ],
    ),
    'Avalokiteśvara (Guanyin)': (
        'The one who came closer',
        'She walks toward the shouting, and you mistake her for an aunt until she has already fixed it.',
        [
            ('Two boatmen are shouting across the dock about a rope. She is at the bollard before either of them has decided to be angry about it, and the argument ends the way arguments end when someone turns up and is simply there.',
             ['dock', 'boatmen', 'rope'], 'none',
             ' She untied the knot that was the actual problem and left the two of them still arguing about the other one.',
             ' Both boatmen will tell this differently and both will say she was closer than they were.'),
            ('{{hour}} she is outside a door where a child has been sent to fetch an adult, and the child is still standing there, and she is crouched down to the child\'s height and staying there until the door opens.',
             ['child', 'door', 'crouched', 'morning', 'dusk', 'evening', 'night', 'hour'], 'none',
             ' She stayed at the child\'s height until the door opened, and the child did not move either.',
             ' The child grew up in that house and always described a visitor, never a vision.'),
            ('A willow branch dipped in clean water cools an argument she never joins. She puts it down, wipes her hands on her apron, and goes back to where the shouting was, which has stopped.',
             ['willow', 'water', 'apron'], 'none',
             ' She cooled it and did not stay to be thanked, and was not thanked.',
             ' She has broken up more arguments in this quarter than there are people who know it was her.'),
        ],
    ),
    'Mañjuśrī (Wenshu)': (
        'The blade that cut the knot',
        'He brings down a blade that cuts the evasions, never the person holding them.',
        [
            ('Two households have been four years in a court over a strip of field. He reads the case once and cuts the middle out of it with two words, and the four years are over, and the field is still there.',
             ['court', 'field', 'dispute'], 'none',
             ' He read the case once, which is less time than it took to hear the first argument.',
             ' He has never once been the losing party in a case, and has never once said why.'),
            ('A child is given a knotted cord and told to find the end. He does not untie it. He shows the child where the second knot is holding the first, and the child works it out alone.',
             ['child', 'knot', 'cord'], 'none',
             ' He did not touch the cord. The child took the rest of the afternoon and did it without him.',
             ' He has watched children work knots out all day and has not once reached in.'),
            ('On the northern slopes, where the pines go up into the cold, he rides a green lion and does not hurry. The people on the road know he is coming and get off it anyway.',
             ['pine', 'mountain', 'road'], 'none',
             ' He came down the whole northern slope and nobody on it was still standing when he passed.',
             ' The pines on that ridge have never been cut, and the villagers are insistent that they were not saved by luck.'),
        ],
    ),
    'Samantabhadra (Puxian)': (
        'The elephant in the mud',
        'He turns up where the digging is and does the part nobody wants, and he is enormous.',
        [
            ('A bridge has been named on a placard for two years and has no deck. He comes to the site with rope, and the placard is the same the next day, and something under it is different.',
             ['bridge', 'rope', 'works'], 'none',
             ' He worked the site until the deck was on, which took most of a season and most of him.',
             ' He put the deck on. Nobody has ever seen him do anything else.'),
            ('The embankment keeps failing in the wet season. He wades into it during the flood and works it from inside, and the fix holds, and the whole village watches from the bank without helping.',
             ['flood', 'embankment', 'mud'], 'none',
             ' He was in the water for a day and a night, and the water was not survivable, and he was.',
             ' The fix held through nine wet seasons, and every one of them was checked.'),
            ('He steadies a post while others lift, and when they set it down he is the one who is standing in the hole they dug, holding it true, waiting for the next timber.',
             ['post', 'timber', 'lift'], 'none',
             ' He held the post true for the better part of a day and nobody thought to relieve him.',
             ' He has not once been asked to do the part that is easy.'),
        ],
    ),
    'Kṣitigarbha (Dizang)': (
        'The light at the bottom of the stair',
        'He goes down where the candle does not reach, and he brings the light with him.',
        [
            ('The mine has been given up as worked-out. He goes down the old shaft with a lamp that is not lit from oil, and the ring on his staff sounds on the stone the whole way, and the men at the top can hear when it stops.',
             ['mine', 'shaft', 'staff'], 'none',
             ' He was down there long enough that the men above stopped talking, and then the staff sounded again.',
             ' He came up out of a mine that had been abandoned for thirty years.'),
            ('At the prison door the warders are courteous and unhelpful, which is the ordinary courtesy of a bad position. He stands there until the door is open, and then he goes in, and it is a long way down.',
             ['prison', 'warder', 'door'], 'none',
             ' He waited at the door for most of a night, and the warders were courteous the whole time.',
             ' The door had been shut for a decade, and he opened it, and it is not said that he asked.'),
            ('He finds the ones who went down and did not come back up, and he does not bring them back. He brings the light down to where they are, which is a different job and takes longer.',
             ['dark', 'lost', 'jewel'], 'none',
             ' He got the light down to the bottom of the stair, which is the part nobody else would attempt.',
             ' He has been found in pits that had been sealed longer than the towns above them existed.'),
        ],
    ),
    'Mahāsthāmaprāpta (Dashizhi)': (
        'The foot that shook the rafters',
        'He stands on ground that is already firm, and it turns out to have been firm the whole time.',
        [
            ('A workshop has stalled: the same joint, the same three people, the same morning for eleven days. He plants one foot outside the door, and the rafters move, and the joint gets cut before anyone has decided to cut it.',
             ['workshop', 'stalled', 'rafters'], 'none',
             ' He did it once and it was enough, and then he stood there while they finished.',
             ' He has broken a stall exactly once, and never needed to do it again in the same workshop.'),
            ('At a river crossing on a day the water is not crossingable, he is simply on the other side, and he has been there a while, and he waits for them rather than calling them across.',
             ['river', 'crossing', 'water'], 'none',
             ' He stood on the far bank the whole afternoon and never once called across.',
             ' He has never told anyone how he crossed, and the ferrymen have stopped asking.'),
            ('Someone is standing at a decision they have been standing at for months. He does not advise. He walks past at a pace that is slightly too fast, and the decision is made by the time he is at the end of the lane.',
             ['decision', 'lane', 'pace'], 'none',
             ' He walked the length of the lane and behind him the thing had been decided.',
             ' He has never given an opinion and he has never been in a room where one was not needed.'),
        ],
    ),
    'Nāgārjuna': (
        'The two rafters',
        'He takes a claim apart in front of you, slowly, until you can see that it was never joined.',
        [
            ('Two brothers are arguing over the inheritance in the courtyard, and getting louder, and the roof of that courtyard is held up by two rafters leaning against each other. He points at them and neither brother speaks again for some time.',
             ['brothers', 'courtyard', 'rafter'], 'none',
             ' He pointed at the roof and left them to it, and they were quiet a long while.',
             ' He has never once taken a side, and both sides send him their disputes anyway.'),
            ('A merchant arrives with a writ that says his claim is unchallengeable. He reads it, turns it over, and asks what would be true if the writ were false. The merchant thinks about it for a long time and leaves with it.',
             ['merchant', 'writ', 'claim'], 'none',
             ' He asked one question and did not ask a second, and the merchant was still thinking when he left.',
             ' He has never lost an argument, because he has never had one.'),
            ('He sits on a stone bench with ink on his fingers and takes a strict claim apart so slowly that the people watching begin to unpick their own.',
             ['bench', 'ink', 'claim'], 'none',
             ' He took it apart over most of an afternoon and they stayed through all of it.',
             ' Three people left that bench having withdrawn a claim they had come to make.'),
        ],
    ),
    'Bodhidharma': (
        'Nine years at the wall',
        'He faced the rock for nine years and the rock was the whole curriculum.',
        [
            ('Through the freezing season he sits with his boots off and his face to bare stone, and the snow comes in through the gap in the wall and settles on him, and in the morning it is there under the ledge, undisturbed.',
             ['snow', 'rock', 'winter'], 'none',
             ' He sat until the snow under the ledge had a second layer over it, and neither was disturbed.',
             ' He faced the same wall for nine years, and the wall is still there.'),
            ('Scholars arrive at the mountain with written treatises and roll them out on the rock. He turns his head enough to say that there is firewood to be brought, and goes back to facing the wall.',
             ['scholars', 'treatise', 'firewood'], 'none',
             ' He did not read a word of any of them, and the firewood did get brought.',
             ' He has never read a treatise, and the ones brought up the mountain are still unopened.'),
            ('{{hour}} the students below the wall have been at it a long time, and he comes out and says the answer to the whole morning\'s difficulty in a form so plain that it sounds like a joke, and then he goes back in.',
             ['students', 'morning', 'wall', 'morning', 'dusk', 'evening', 'night', 'hour'], 'none',
             ' He came out once, said the whole thing, and went back in before anyone had understood it.',
             ' The plain answer has not been understood since, and he has never offered another.'),
        ],
    ),
}

# The eight generic people. name -> (title variant, one_liner, [variants])
GEN = {
    'Shen the night clerk': (
        'The column he finished after the curfew',
        'His abacus is still clicking long after the market has gone dark.',
        [
            ('The last three columns of the night are the ones nobody checks, and he checks them twice, and the reason he checks them twice is that a wrong figure at the fourth hour is found by someone who cannot fix it.',
             ['column', 'abacus', 'fourth hour'], 'none',
             ' He went back over the fourth column after the ledger was shut, and the fifth, and then he shut it again.',
             ' There is one column in that ledger he has never once got wrong, and it is the one nobody reads.'),
            ('A boy comes in at the second hour to ask for something he has no right to ask for. He writes it down, which is the answer, and the boy does not understand that and is told anyway.',
             ['boy', 'second hour', 'ledger'], 'none',
             ' He wrote the whole thing out in the book so that it existed, which is more than the boy asked for.',
             ' He has never refused a boy anything and has never once made it look like a favour.'),
            ('At closing he reads the day back through once without expression, the way a man reads a road he has walked a thousand times and still checks for the part that has moved.',
             ['closing', 'reading', 'road'], 'none',
             ' He read the whole day back and did not find anything, and sat with that for a while.',
             ' He has caught two errors in nineteen years and one of them was in his own hand.'),
        ],
    ),
    'Zhao the early courier': (
        'The long way round, in the rain',
        'He cuts the twine and the parcel is dry, and so is everything else in it.',
        [
            ('The rain comes in sideways off the wall and the road turns to soup two miles short of the gate. He does not complain about it, because he has been doing this since before the gate had a name, and he goes the long way around.',
             ['rain', 'road', 'gate'], 'none',
             ' He went the long way in the rain and arrived early, and does that every time.',
             ' He has not lost a parcel in twenty years, and he has been rained on four thousand.'),
            ('A householder asks whether the sealed letter has been opened. He hands it across, seal up, and waits while the man looks at it, and then he takes it back and goes.',
             ['letter', 'seal', 'householder'], 'none',
             ' He waited the whole time the man was deciding, and did not once look away from the road.',
             ' Not one of his parcels has been opened, and he does not know what any of them say.'),
            ('{{hour}} he is at the gate before it is opened, sitting on the wall with his pony, and he has been there since before there was anything to sit there for.',
             ['gate', 'pony', 'wall', 'morning', 'dusk', 'evening', 'night', 'hour'], 'none',
             ' He was on the wall before the gate opened and again after it closed.',
             ' He has ridden out of this city more times than the city has had a gatekeeper.'),
        ],
    ),
    'Auntie Qian the keyholder': (
        'The key she turns twice',
        'The heavy latch-key hangs beside the dried peppers, and it is not for the door it opens.',
        [
            ('In the flood year the water came to the third step and she turned that key and went down to the neighbour\'s cellar, and the neighbour\'s cellar is dry, and nobody has ever established how she knew.',
             ['flood', 'cellar', 'step'], 'none',
             ' She went down in the flood with the key already out and did not hurry once.',
             ' She has opened a door that was not hers in a year when every door in the quarter was under water.'),
            ('She holds the key for four households on the lane, and the argument about whose turn it is to be given it is an old one and is settled annually, in the same way, in the same week.',
             ['key', 'lane', 'households'], 'none',
             ' She held the key another year and said the thing she says every year.',
             ' Four households have never once been locked out, in a quarter where that is not normal.'),
            ('The dried peppers are for keeping, not for eating, and the key is for the cellar, and both of these facts are known to everybody on the lane and neither is ever explained.',
             ['peppers', 'cellar', 'keeping'], 'none',
             ' She has said nothing about any of this for eleven years and nobody has thought to ask.',
             ' She keeps a thing for everybody on that lane and has never named the arrangement.'),
        ],
    ),
    'Old Lu the ferry counter': (
        'Grain on one side, and no short weight',
        'He balances peasant grain across a gravel slip and has never once weighed a man short.',
        [
            ('He balances the load in two baskets at a time and puts the heavier one on the ferryman\'s side. This is not politeness. It is a practice kept since before the current was, and he would be harder to argue with about it than about anything.',
             ['basket', 'grain', 'balance'], 'none',
             ' He put the heavy basket on the far side again, and the ferryman did not thank him for it, because that is the arrangement.',
             ' He has balanced every load on this slip for thirty years and not one has gone short.'),
            ('A man with a full load looks at the water and then at the counter, and Lu takes the basket off, and puts a stone in it, and sends it over. He does not explain and is not asked to.',
             ['water', 'counter', 'load'], 'none',
             ' He put a stone in the basket so it would not be taken as a full one, and went back to his work.',
             ' He has added a stone to more baskets than anyone has counted, and never once said why.'),
            ('{{hour}} the crossing is busy and he is doing four things at once, and if you ask him anything he tells you the answer while his hands keep going, and the answer is right.',
             ['crossing', 'busy', 'hands', 'morning', 'dusk', 'evening', 'night', 'hour'], 'none',
             ' He answered four people in the time it took him to cross the slip twice, and got all four right.',
             ' On the worst day of the flood season he did not sit down once.'),
        ],
    ),
    'Master Yan the quiet mender': (
        'The gate-hung, three owners deep',
        'He has mended the same gate for three households and will not take more for it.',
        [
            ('He has mended the same gate-hung for three owners. He will do it again for a fourth, and the price has not moved in twenty years, and he says so the same way every time, which is to say once, and then not again.',
             ['gate', 'mended', 'price'], 'none',
             ' He mended the same hung again and did not charge for it, and did not say that he would not.',
             ' That gate has been mended by him for longer than it has hung on the same hinge.'),
            ('An adze and a coil of split bamboo, tucked in the sash, are the whole of what he carries. He sets the tools down before he picks up the broken thing, which is a habit and not a courtesy.',
             ['adze', 'bamboo', 'tools'], 'none',
             ' He put the tools down before he touched the work, and picked them up again after.',
             ' He has never once been seen carrying a bag, and he has mended everything.'),
            ('The thing brought to him is always already half-mended by someone else. He does not take it apart to look. He mends what the other person stopped at.',
             ['broken', 'half-mended', 'work'], 'rare',
             ' He finished the other man\'s work without undoing any of it, which is the hardest thing to do.',
             ' He has never once told anyone their mend was wrong, and has changed the grain direction to suit it.'),
        ],
    ),
    'Old Wu the courtyard guest': (
        'The one who was already there',
        'He takes bun crusts from your palm and never barks at a late arrival.',
        [
            ('He is on the step before the household has decided who else is staying, and the step is warm from the afternoon and he is in the warm part of it, and this is a position he holds deliberately.',
             ['step', 'warm', 'household'], 'none',
             ' He was on the warm part of the step before the household had counted itself.',
             ' He was at that gate before the gate was hung, and the household has never owned him.'),
            ('A stranger comes in late, and Old Wu does not bark, and the household does not ask why, and the stranger stays for the night without anyone having agreed to it.',
             ['stranger', 'late', 'night'], 'none',
             ' He did not bark, and the household did not ask him to not bark, and both of those are the arrangement.',
             ' He has never once barked at anybody coming in, and nobody can say when he decided that.'),
            ('{{hour}} he eats off the ground, on the paving, in the same three places, and whichever one he is in tells you what kind of day the household has had.',
             ['paving', 'ground', 'hour'], 'none',
             ' He had not moved off the paving all day, which meant something to the people who knew how to read it.',
             ' He chooses the paving and not the mat, and the household has learned to read which.'),
        ],
    ),
    'Elder Cui the evening caller': (
        'The bell and the man who matches it',
        'He calls the evening as the temple bell rings, and has for longer than the bell has hung.',
        [
            ('The bell is rung and he calls the evening, and they are not two things that happen to coincide. He has matched his voice to that bell for so long that the temple staff set the hour by whichever of the two arrives first.',
             ['bell', 'voice', 'evening'], 'none',
             ' He matched the call to the bell again, and the bell has not been re-hung in fifty years.',
             ' The temple has kept his hour, not the other way round, and both sides know it.'),
            ('A basket of river fish arrives with him every evening and goes out again by morning, and the household that cooks from it is not always the household he sleeps in.',
             ['basket', 'fish', 'household'], 'none',
             ' He carried the basket in and set it down and left without staying for the answer.',
             ' He has fed more households through that basket than he has ever slept in.'),
            ('He calls in a cold rain with his sleeves wet through, and the calling is louder for it, and the households that are lit come to the door, and the ones that are not stay shut and that is also accounted for.',
             ['rain', 'sleeves', 'door'], 'none',
             ' He called the whole evening in the rain and did not shorten it by one word.',
             ' On the wet nights he calls longer, and the river people have counted it.'),
        ],
    ),
    'Brother De the water-carrier': (
        'Two climbs, the second one unasked',
        'His shoulder-pole creaks through the frost and the pails come up full every time.',
        [
            ('{{hour}} the pails go up two flights in the cold and come down full, and the third household is at the top of the hill and has never once asked for anything, and still gets its pail filled.',
             ['pails', 'hill', 'frost', 'morning', 'dusk', 'evening', 'night', 'hour'], 'none',
             ' He made the second climb that morning without being asked, which is the usual arrangement.',
             ' He has filled that top house for longer than the top house has existed.'),
            ('He dumps the spring water and the splash goes everywhere, and the household shouts at him, and he laughs, and next morning he dumps it in exactly the same place.',
             ['spring', 'dumping', 'laughter'], 'none',
             ' He dumped it in the same place the next morning and laughed again when they shouted.',
             ' He has never once changed where he puts the water down.'),
            ('A household in the quarter moved out and left the pail behind. He carries water to the empty house anyway for a month, and when the pail is finally thrown out he carries two.',
             ['empty house', 'pail', 'month'], 'none',
             ' He carried water to the empty house for a month after the people had gone, and nobody saw.',
             ' He still walks past that house with a full pail, and it has been empty a long time.'),
        ],
    ),
}


def mb(text, i, opener='{', closer='}'):
    depth = 0
    quote = None
    while i < len(text):
        ch = text[i]
        if quote is not None:
            if ch == '\\':
                i += 2
                continue
            if ch == quote:
                quote = None
            i += 1
            continue
        if ch in "'\"":
            quote = ch
            i += 1
            continue
        if ch == opener:
            depth += 1
        elif ch == closer:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise SystemExit('unbalanced')


def lit(v):
    return "'" + v.replace('\\', '\\\\').replace("'", "\\'") + "'"


def render_row(name, spec, indent):
    """The whole row. Kept for the dry-run check below."""
    title, one_liner, variants = spec
    p = ' ' * indent
    q = ' ' * (indent + 2)
    r = ' ' * (indent + 4)
    o = [f'{p}{{', f'{q}name: {lit(name)},', f'{q}one_liner:',
         f'{q}  {lit(one_liner)},', f'{q}templates: [']
    for detail, tags, gate, long_fire, rare in variants:
        o += [f'{r}{{',
              f'{r}  name:',
              f'{r}    {lit(title)},',
              f'{r}  one_liner:',
              f'{r}    {lit(one_liner)},',
              f'{r}  detail:',
              f'{r}    {lit(detail)},',
              f'{r}  tags: [{", ".join(lit(t) for t in tags)}],',
              f"{r}  gate: '{gate}',",
              f'{r}  long_fire:',
              f'{r}    {lit(long_fire)},',
              f'{r}  rare:',
              f'{r}    {lit(rare)},',
              f'{r}}},']
    o += [f'{q}],', f'{p}}},']
    return '\n'.join(o)


def render_templates(spec, indent):
    """The whole `templates: [...]` array, for a row that has none yet.

    Delegates to render_objects so the two paths cannot drift. The first
    version of this function built the array inline and reassigned `o` inside
    its loop, so it emitted only the LAST variant and left a stray accumulator
    behind — which is why a row that "took" three variants had one.
    """
    p = ' ' * indent
    objs = render_objects(spec, indent + 2)
    return f'{p}templates: [\n{objs}\n{p}]'


def render_objects(spec, indent):
    """Just the template objects, for a row that ALREADY has a templates array.

    Emitting a second `templates:` key is not a merge. The array's own closing
    bracket stays where it is and the new key lands after it, which parses as
    a duplicate property and breaks the row.
    """
    ALL_TITLE, ALL_ONE_LINER, variants = spec
    q = ' ' * indent
    o = []
    for detail, tags, gate, long_fire, rare in variants:
        o += [f'{q}{{',
              f'{q}  one_liner:',
              f'{q}    {lit(ALL_ONE_LINER)},',
              f'{q}  detail:',
              f'{q}    {lit(detail)},',
              f'{q}  tags: [{", ".join(lit(t) for t in tags)}],']
        # NO `name` on a variant. SPEC 16.1: a figure card names the figure.
        # A variant title made a harvest read as a generic row, which is how a
        # long fire came to look like it dropped every named figure.
        #
        # A gate is opt-in. These variants are the row's OWN phrasings, not a
        # bonus for a rarer card, and gating every one of them at 'uncommon'
        # meant a long fire — which always rolls uncommon or better — could
        # never render the figure's own name. All 300 long-fire figure cards
        # came out titled with a variant instead, which reads to a player as a
        # generic row. The extra text a long or rare card earns now comes from
        # the `long_fire` / `rare` clauses these variants carry, which is the
        # mechanism that is actually keyed to the fire.
        if gate != 'none':
            o.append(f"{q}  gate: '{gate}',")
        o += [f'{q}  long_fire:',
              f'{q}    {lit(long_fire)},',
              f'{q}  rare:',
              f'{q}    {lit(rare)},',
              f'{q}}},']
    return '\n'.join(o)


def apply(path, spec_map, array_name, replace_templates=False):
    src = Path(path).read_text()
    touched, skipped = 0, 0
    edits = []
    for name, spec in spec_map.items():
        marker = f"name: '{name}',"
        if marker not in src:
            raise SystemExit(f'{path}: row not found: {name}')
        at = src.index(marker)
        # Skip figure rows that appear in both arrays: match the row object that
        # this array actually owns, not the first `{` before the name anywhere.
        arr_at = src.index(array_name)
        if at < arr_at:
            nxt = src.find(marker, at + 1)
            if nxt == -1:
                raise SystemExit(f'{path}: row {name} is not in {array_name}')
            at = nxt
        row_open = src.rindex('{', 0, at)
        row_close = mb(src, row_open)
        body = src[row_open:row_close + 1]

        # REPLACE, not append. These rows' template sets are authored in full
        # above, so the file is made to match rather than grown by repeated
        # runs. The earlier append-only version skipped a row when its FIRST
        # title was already present, which is why a retitle appeared to do
        # nothing: the stale title matched and the row was left alone.
        replaced = False
        if replace_templates and '    templates: [' in body:
            arr_open = body.index('[', body.index('    templates: ['))
            arr_close = mb(body, arr_open, '[', ']')
            objs = render_objects(spec, 6)
            body = body[:arr_open + 1] + '\n' + objs + '\n    ' + body[arr_close:]
            replaced = True
        else:
            already = spec[0] in body
            has_own = all(v[0] in body for v in spec[2])
            if already and has_own:
                print(f'  skip (already authored): {name}')
                skipped += 1
                continue

        title, one_liner, variants = spec
        # The row keeps its own detail, tags and qualifiers; only the template
        # set is authored here. When the set was REPLACED above, the merge
        # branch below must not also run — it appended a second copy of the
        # same three objects, which is how a row ended up with six templates
        # that all render the same title.
        if not replaced and '    templates: [' in body:
            arr_open = body.index('[', body.index('    templates: ['))
            arr_close = mb(body, arr_open, '[', ']')
            # merge the objects into the existing array
            objs = render_objects(spec, 6)
            body = body[:arr_close] + objs + '\n' + body[arr_close:]
        else:
            # Insert after the row's `tags` ARRAY, not after the first newline
            # following the keyword. Several authored rows wrap their tags over
            # multiple lines, and anchoring on the newline drops a new
            # `templates:` in the middle of the list.
            #
            # The insert point is the end of the whole tags LINE, comma
            # included. Anchoring at the bracket and skipping whitespace lands
            # *on* the comma and emits `],,`; anchoring at the keyword and
            # taking the first newline lands *before* a wrapped list.
            tags_at = body.index('    tags: [')
            tags_open = body.index('[', tags_at)
            tags_end = mb(body, tags_open, '[', ']')
            line_end = body.index('\n', tags_end) + 1
            tmpl = render_templates(spec, 4)
            body = body[:line_end] + tmpl + '\n' + body[line_end:]

        edits.append((row_open, row_close, body))
        touched += 1

    for start, end, new in sorted(edits, key=lambda x: -x[0]):
        src = src[:start] + new + src[end + 1:]
    Path(path).write_text(src)
    print(f'{path}: {touched} rows authored, {skipped} skipped, '
          f'{sum(len(v[2]) for v in spec_map.values())} variants')


def main():
    require_clean(
        [str(FIGURES), str(PEOPLE)],
        'the person card variants in the figure and generic catalogs',
    )
    apply(FIGURES, FIG, 'export const FIGURE_PEOPLE: readonly CatalogEntry[] = [')
    apply(PEOPLE, GEN, 'const PEOPLE: readonly CatalogEntry[] = [')


if __name__ == '__main__':
    main()

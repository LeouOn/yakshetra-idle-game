// Authored card catalogs for Manifest table-fill. Pure content-as-data:
// no imports beyond the kind union, no logic. Adding a kind = add a table
// here and register it in CATALOG.

import { FIGURE_PEOPLE, FIGURE_PLACES } from './manifest-catalog-figures';
import type { CatalogEntry, CatalogMap } from './table-catalog';

// The single definition of a catalog row lives in ./table-catalog, which also
// carries CardTemplate. A second, narrower interface here is how `templates`
// ends up type-checking in one place and failing in another.
export type { CatalogEntry, CatalogMap } from './table-catalog';

const THINGS: readonly CatalogEntry[] = [
  {
    name: 'Sealed token',
    one_liner:
      "A lead token stamped by the granary clerk, recording a full day's weighing completed at the scales.",
    subject: 'a stamped granary token',
    detail:
      "Work at the river weigh-scales earned this thumb-sized token of gray lead, marked with the clerk's chisel-stamp. Kept tucked in a sash, it proves your labor was tallied and accepted before the warehouse doors bolted for the night.",
    long_fire: ' The lead is warm, and the stamp bites deeper than it did this morning.',
    rare: ' The clerk cut it once, and the blank beside it stayed blank all season.',
    tags: ['token', 'kept'],
    templates: [
      {
        detail:
          "The clerk's chisel-stamp sits off-center, the way a hand stamps when it is tired. You keep it in the sash {{hour}} and find it with your thumb before you have decided to look — {{count}} of labor, weighed, accepted, and closed.",
        tags: ['hands', 'weight'],
      },
      {
        gate: 'rare',
        flourish: 'The lead is warm still, as if it had been handed over an hour ago.',
        detail:
          'Nobody asked for the token. You took it anyway, and the weight of it has stayed in your pocket like a stone you meant to throw away and never did.',
      },
      {
        era: 'fantasy',
        detail:
          'A waxed clay token the size of a thumb, kept in the fold of the outer robe so it can be pressed into another hand without a word passing between them.',
        tags: ['token', 'silence'],
      },
      {
        name: 'Chisel-stamped token',
        one_liner:
          'A lead token cut with a stamp worn thin at one corner, kept in the sash and weighed in the hand more often than it is spent.',
        detail:
          'You have stopped thinking of it as proof of anything. It is a thing you keep, and you know the weight of it without looking.',
        tags: ['second'],
      },
    ],
  },
  {
    name: 'Worn ledger',
    one_liner:
      'A hemp-stitched account book of mulberry paper, its margins thumbed dark by oil lamp and well-water.',
    subject: 'a stitched mulberry-paper account',
    detail:
      'Rows of small brush-strokes track every basket of salt and bundle of firewood carried past the slipway. Where the same laborer returned at dusk, the paper is worn soft as old silk, but the final tally balances without a single missing copper.',
    long_fire: ' Every column has been gone over twice, which is twice more than the tally needed.',
    rare: ' No other account book in the district has survived its own owner.',
    tags: ['ledger', 'return'],
    templates: [
      {
        detail:
          'The margins are thumbed to a soft brown, one page at a time. You open it {{hour}} without needing to look down, and the figures are still legible under the grease — every basket in its column, the total balanced.',
        tags: ['thumbed', 'columns'],
      },
      {
        gate: 'uncommon',
        detail:
          'Somebody before you folded the last page flat with a thumbnail to keep the corner. You have started doing the same, which is how you know the habit has already changed hands.',
      },
      {
        era: 'fantasy',
        detail:
          'A ledger of grafts and grudges written on paper so old it has gone the colour of weak tea, every debt settled by a small green mark that means nothing to anyone but the two of them.',
        tags: ['ledger', 'debt'],
      },
      {
        name: 'Thumbed account',
        one_liner:
          'A mulberry-paper account book gone soft at the corners, its columns still adding up after every hand that has turned it.',
        detail:
          'Somebody before you wrote the totals in a careful, upright hand, made mistakes in the hundreds column, and ruled them out neatly. You inherited the ruling as much as the sum.',
        tags: ['second'],
      },
    ],
  },
  {
    name: 'Folded measure',
    one_liner:
      "A six-fold carpenter's rule of seasoned boxwood, hinged with flat brass pins that still snap into place.",
    subject: 'a jointed boxwood rule',
    detail:
      'Carved notches mark both the imperial foot and the shorter river pace used by boatwrights along the canal. When unfolded against rough-hewn timber, its straight edge cuts through dispute before the first saw-cut is made.',
    long_fire: ' Six leaves, all of them true, checked against a beam you have since cut.',
    rare: ' A rule like this is made once, by one hand, and then not again.',
    tags: ['measure', 'portable'],
    templates: [
      {
        detail:
          'Unfolded against rough timber the brass pins snap true and the edge settles before you have finished the argument. It lives in the belt sash, and it took {{count}} to be trusted with the length of a beam.',
        tags: ['edge', 'true'],
      },
      {
        gate: 'rare',
        flourish: 'The hinge has gone the color of old tea.',
        detail:
          'Boatwrights along the canal have stopped arguing with you about the river pace, which they would not have done a year ago and cannot entirely explain.',
      },
      {
        era: 'fantasy',
        detail:
          'A folding rule cut from a white river cane in six leaves, hinge pins of green jade, stilled now because nothing in the garden is measured the same way twice.',
        tags: ['rule', 'jade'],
      },
      {
        name: 'Six-leaf rule',
        one_liner:
          'A six-fold boxwood rule with flat brass pins, unhurried in the hand, and the only straight edge in the workshop.',
        long_fire:
          ' You keep it shut when other people are in the room, and you have never said why.',
        rare: ' A second rule like this would mean somebody measuring the same thing twice and wanting both numbers.',
        detail:
          'You learned to trust it by checking it twice, which is the only way anyone ever trusts a ruler. The sixth leaf is the one you use now, and you have never once extended it fully.',
        tags: ['second'],
      },
    ],
  },
  {
    name: 'Quiet instrument',
    one_liner:
      'A cast-bronze chime resting in washed fleece on the bench, waiting to strike the change of the midday shift.',
    subject: 'a bronze workshop chime at rest',
    detail:
      'Cast thick with a flat rim, it sits beside the whetstones until the work needs a clean pause. When struck with the wooden mallet, its low resonance cuts through saw-noise and workshop talk to call everyone away from the benches.',
    long_fire: ' Struck once more after everyone had gone, for no audience but the wall.',
    rare: ' There is one of these, and it is not for sale at any price.',
    tags: ['instrument', 'rest'],
    templates: [
      {
        detail:
          'It does not ring so much as interrupt. Struck with the wooden mallet {{hour}}, its low note cuts clean through the workshop noise and the benches go quiet without anyone raising a voice.',
        tags: ['note', 'silence'],
      },
      {
        gate: 'uncommon',
        detail:
          'You keep it in washed fleece. Handling it before a difficult cut steadies the hand in a way you could not explain to anyone who has not tried.',
      },
      {
        era: 'fantasy',
        detail:
          'A bowl-rung of fired clay, hung on a silk cord above the sleeping quarters; struck once it stops an argument that would otherwise run until morning.',
        tags: ['rung', 'silence'],
      },
      {
        name: 'The bench chime',
        one_liner:
          'A flat-rimmed bronze chime in washed fleece, and the only sound in the workshop that makes people stop.',
        detail:
          'It is not tuned to anything you could name. Struck at the wrong moment it sounds like a question; struck at the right one it sounds like the end of one.',
        tags: ['second'],
      },
    ],
  },
  {
    name: 'Second bowl',
    one_liner:
      'A simple brown earthenware bowl, kept clean beside the hearth for whoever arrives at mealtime.',
    subject: 'a spare earthenware bowl',
    detail:
      'Shaped from local river clay and fired dark, it stays on the shelf beside the cooking pot rather than in the family cupboard. When an uninvited traveler stops at the gate, you ladle hot broth into it first before portioning your own dinner.',
    long_fire: ' Washed again at dusk, though nothing has been in it since the morning.',
    rare: ' It has always been the second bowl, and always been meant for someone.',
    tags: ['bowl', 'given'],
    templates: [
      {
        detail:
          'Fired dark from river clay, it lives beside the pot and not in the cupboard. When someone stops at the gate {{hour}}, the broth goes into that one first, before you portion your own.',
        tags: ['hearth', 'first'],
      },
      {
        gate: 'rare',
        flourish: 'It has outlived two hearths and is still the bowl on the shelf.',
        detail:
          'Nobody has ever asked whose bowl it was. You have stopped offering to explain, which is its own kind of answer.',
      },
      {
        era: 'fantasy',
        detail:
          'A second bowl kept unwashed on the sill, so that whoever knocks after the gates close can tell there was always a place set for them.',
        tags: ['bowl', 'given'],
      },
      {
        name: 'The bowl on the sill',
        one_liner:
          'A brown earthenware bowl kept by the pot and not in the cupboard, for whoever turns up after the household has eaten.',
        detail:
          'You have washed it more times than you have used it, and you have never once considered putting it away.',
        tags: ['second'],
      },
    ],
  },
  {
    name: 'Shared cloak',
    era: 'tang',
    one_liner:
      'A heavy wool cloak treated with mutton tallow against river sleet, hung by the latch for whoever leaves last.',
    subject: 'a shared wool river-cloak',
    detail:
      'Patched at both elbows with boiled leather from an old harness, it has warmed three apprentices and a stranded courier through the first freeze. When you take the dark lane home without it, your shoulders remember its weight even in the damp wind.',
    long_fire: ' It has dried slowly, twice, and kept the shape of every shoulder.',
    rare: ' Four people have patched it, and no two patches are the same cloth.',
    tags: ['cloak', 'shared'],
    templates: [
      {
        detail:
          'Mutton tallow and boiled leather at both elbows, heavy when wet. Whoever leaves last wears it, and when you take the dark lane without it your shoulders go on reporting the weight all the way home.',
        tags: ['wool', 'last'],
      },
      {
        gate: 'uncommon',
        detail:
          "It has warmed three apprentices and a stranded courier through the first freeze. You do not think of it as a garment. You think of it as the door's second argument against the cold.",
      },
      {
        era: 'fantasy',
        detail:
          'A rain-dark cloak of waxed flax on the same peg for thirty years, patched by four different hands, none of whom remembers patching it.',
        tags: ['cloak', 'shared'],
      },
      {
        name: 'The other cloak',
        one_liner:
          'A river-cloak of treated wool, heavy when wet, on the same peg for whoever walks home in the dark lanes last.',
        detail:
          'It has been mended by four hands that never spoke about it, and the patches are placed by whoever was nearest and never moved again.',
        tags: ['second'],
      },
    ],
  },
  {
    name: 'Notched pruning bill',
    one_liner: 'A briar billhook kept sharp on a flat river stone, for green wood only.',
    subject: "the pruner's own billhook",
    detail:
      'The blade is kept sharp on a flat river stone, and the edge is meant for green wood, not dry. Briar root dulls it in a season, so Dan sharpens it before the light goes.',
    long_fire: ' The haft has taken the sap of a hundred green runs and wears darker at the grip.',
    rare: ' The inner crescent is thin enough to read daylight through, and still has not chipped.',
    tags: ['briar', 'hook', 'cutting'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'You are holding the hook when the blackthorn is still running, and the sap is on your thumb before you notice the cut.',
        tags: ['briar', 'sap', 'hook'],
      },
      {
        detail:
          'The crescent goes through green wood and the split runs straight along the grain, which is the only way a briar is cut at all.',
        tags: ['briar', 'grain', 'hook'],
      },
    ],
  },
  {
    name: 'Water-slate stylus',
    one_liner: 'A river-bone stylus for writing on wet slate that will not wait for you.',
    subject: "the attendant's river-bone stylus",
    detail:
      'A slate is wet, and what you put on it has minutes to be said. The thread keeps the stylus from sliding and the hand from warming the stone faster than it should be dried.',
    long_fire:
      ' The slate is still cool to the touch, which means the water has not finished with it yet.',
    rare: ' Someone wrote a whole name on this stone and then let the canal take it back.',
    tags: ['slate', 'writing', 'wet'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'The slate is cool and already going soft at the edges, and there is not much time left to say it on.',
        tags: ['slate', 'water', 'writing'],
      },
      {
        detail:
          'The flax is greasy enough to turn in your hand, and everything you mark blurs the moment you lift the stone away.',
        tags: ['slate', 'flax', 'writing'],
      },
    ],
  },
  {
    name: 'Washed fleece cushion',
    one_liner: 'A bench pad soaked and dried until it holds warmth and gives none.',
    subject: 'the bench pad by the outer gate',
    detail:
      'Wool that still carries its oil turns cold the instant the wind finds it. This one has been soaked and dried enough times to hold warmth and give none.',
    long_fire:
      ' The wool has taken the shape of everyone who has sat on it, and holds none of them now.',
    rare: ' The canal water ran through this pad eleven times. You can count the ridges with your thumb.',
    tags: ['wool', 'bench', 'cold'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'You sit down on the outer bench and the cold goes out of your back in about the time it takes to count to twenty.',
        tags: ['bench', 'cold', 'wool'],
      },
      {
        detail: 'The fleece smells of slow water and nothing else, which is the point of it.',
        tags: ['wool', 'water', 'bench'],
      },
    ],
  },
  {
    name: 'Braided vow-cord',
    one_liner: 'Three hemp strands round one wire, notched for counting laps between the basins.',
    subject: 'the cord the vow-walkers carry',
    detail:
      'A promise is easier to keep if it can be counted in laps. The knots are not decoration; each one is a lap walked out and survived.',
    long_fire:
      ' The fifth knot has gone black with oil, and the wire under it is warm from being worked.',
    rare: ' Every notch on this cord has been walked twice, once going out and once coming back.',
    tags: ['cord', 'knot', 'vow'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'The notches are worn round and the fifth is black, and you can feel how many times it has been gripped.',
        tags: ['knot', 'cord', 'oil'],
      },
      {
        detail:
          'Three strands around one wire. Pull it and all three answer at once, which is what a vow is supposed to sound like.',
        tags: ['cord', 'knot', 'wire'],
      },
    ],
  },
  {
    name: 'Storm-reed whistle',
    one_liner: 'A plugged reed on a lanyard, for warning the court of the storm-edge.',
    subject: 'the post whistle',
    detail:
      'It makes almost no sound, which is the design. Everyone at the post is already looking the same way, so the whistle only has to be pointed in the right direction.',
    long_fire:
      ' The wax has been reheated so often it sits flush, and the note it gives is the same one every time.',
    rare: ' The reed is split a hairline down one side, and it still carries.',
    tags: ['whistle', 'reed', 'warning'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'The reed gives one short note and everyone at the post is already facing outward before the sound has finished.',
        tags: ['whistle', 'reed', 'post'],
      },
      {
        detail:
          'You put it to your mouth and the wax plug makes a low, closed sound that carries further than a shout would.',
        tags: ['whistle', 'wax', 'reed'],
      },
    ],
  },
  {
    name: 'Stoneware hearth-crock',
    one_liner: 'Bitter root kept warm in the ashes, for whoever cannot say what is wrong.',
    subject: 'the crock kept warm in the ashes',
    detail:
      'It is not medicine and it is not tea. It is kept at a drinkable warmth for the people who come in too shaken to say what is wrong, and it is always ready.',
    long_fire:
      ' The root has steeped long enough to lose its edge, and the heat is coming up through the grey clay.',
    rare: ' Nobody in the court has ever seen this crock refilled by the person they filled it for.',
    tags: ['crock', 'root', 'warm'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'You unscrew the pine bung and the bitter smell comes up out of the grey clay, and the warmth of it is the whole offer.',
        tags: ['crock', 'root', 'warm'],
      },
      {
        detail:
          'It sits in the ash where a person can reach it without being asked, and it has been there all night.',
        tags: ['crock', 'ash', 'root'],
      },
    ],
  },
];

const OUTCOMES: readonly CatalogEntry[] = [
  {
    name: 'A door that stays open',
    era: 'tang',
    one_liner:
      'A heavy oak postern propped open with an ash wedge, letting late carters slip in past the curfew bell.',
    subject: 'an unlatched courtyard gate',
    detail:
      'The iron drop-bolt stays greased and lifted while the market patrol marches past the end of the lane. Anyone coming cold off the river packet finds the threshold swept and the latch-string hanging out on the public side.',
    long_fire: ' Left unlatched through a whole second night, and nobody took advantage of it.',
    rare: ' In eleven years, nobody has had to knock twice.',
    tags: ['opening', 'held'],
    templates: [
      {
        detail:
          'The drop-bolt stays lifted and the latch-string hangs out on the public side. You keep it that way {{hour}} through the patrol, and cold people off the river packet come in without knocking, which is the whole point of it.',
        tags: ['threshold', 'unlatched'],
      },
      {
        name: 'The wedge that holds it',
        one_liner:
          'An ash wedge, tapered by a hundred knuckles, keeping the postern off its latch through the whole patrol.',
        detail:
          'You set it with your heel before you set anything else, and you take it out again at dawn, and nobody has ever asked you why you bother either way.',
        tags: ['variant'],
      },
      {
        name: 'Past the curfew bell',
        one_liner:
          'The bolt stays lifted, the lane stays open, and neither of those is a kindness. It is arithmetic.',
        detail:
          'A carter at the second hour is a carter who will be there again at the fourth, and the market pays for both. You have stopped calling it generosity and started calling it the price of a reputation.',
        tags: ['variant'],
      },
    ],
  },
  {
    name: 'A debt settled',
    one_liner:
      'A double brush-stroke of vermilion ink drawn across the tavern tab, closing an obligation from the flood year.',
    subject: 'a struck ledger account',
    detail:
      'Three jars of fermented bean paste and an afternoon spent re-shingling the oil press settled what cash could not. The innkeeper nodded without looking up from his abacus, folding the receipt slip into your sleeve.',
    long_fire: ' The ledger line is struck through slowly, as if the striking down were the point.',
    rare: ' That is the only account in the district closed in full.',
    tags: ['settled', 'account'],
    templates: [
      {
        detail:
          'Two strokes of vermilion across the tavern tab and the flood-year account is closed. {{count}} went into settling it: bean paste, an afternoon on the oil press, and the particular patience of a person who is owed.',
        tags: ['ink', 'closed'],
      },
      {
        detail:
          'Two strokes of vermilion and the account is closed. {{tie}} would have called that payment, and {{tie}} was not wrong to.',
        tags: ['tie'],
      },
      {
        name: 'The stroke that closed it',
        one_liner:
          'One brush stroke of vermilion, drawn hard enough to score the mulberry paper underneath.',
        detail:
          'The man who owed you looked at the mark for a while before he looked at you, and whatever he decided to feel about it he kept to himself. The tab is a tab. That was the whole of it.',
        tags: ['variant'],
      },
      {
        name: 'Settled in bean paste',
        one_liner:
          'Three jars of fermented paste and a re-shingled oil press, against an amount that cash could not argue with.',
        detail:
          'You did the arithmetic twice and it came out the same both times, which is the only reason you slept. The jars are in the cellar now. The tab has a red line through it and no name beside it.',
        tags: ['variant'],
      },
    ],
  },
  {
    name: 'A name remembered',
    one_liner:
      "A wandering cooper greeted by name at the canal lock, spared the constable's suspicious questioning.",
    subject: 'a traveler remembered at the lock',
    detail:
      'You spoke his surname and his home village before he could unroll his travel permit onto the damp stone. The recognition passed down the line of waiting porters like dry kindling, turning a tense inspection into ordinary business.',
    long_fire: ' Said aloud a second time, to someone who was not there the first time.',
    rare: ' It is the only name that gets said without being asked for.',
    tags: ['name', 'kept'],
    templates: [
      {
        detail:
          'You said his surname and his home village before he could unroll the permit onto the damp stone. It passed down the line of porters like dry kindling, and the inspection became ordinary business.',
        tags: ['name', 'lock'],
      },
      {
        gate: 'rare',
        flourish: 'He has not come back. He is not expected to.',
        detail:
          'The cooper still nods at the lock, and neither of you mentions it. Some arrangements work best by never being named in daylight.',
      },
      {
        detail:
          'You have never written it down. It survives the way a voice survives a room, and {{tie}} is the reason it has not been forgotten yet.',
        tags: ['tie'],
      },
      {
        name: 'His surname, at the lock',
        one_liner:
          'A wandering cooper, greeted by name before he could unroll the permit onto the damp stone.',
        detail:
          'You said his surname and his home village and the line of porters passed it along behind him like dry kindling catching. By the time the constable got to him he was ordinary business, and nobody looked up twice.',
        tags: ['variant'],
      },
      {
        name: 'The permit, unrolled for nothing',
        one_liner:
          'A document that was never needed, and a man who did not have to explain himself.',
        detail:
          'He kept it in his hand a while after, folded again, and then he did not use it, and you understood that this had not been a courtesy to him. It had been a thing you did because you knew his name.',
        tags: ['variant'],
      },
    ],
  },
  {
    name: 'A storm that missed',
    one_liner:
      'Black thunderheads split over the southern ridge, dumping their hail onto bare gravel slopes instead of the barley.',
    subject: 'a summer gale that broke elsewhere',
    detail:
      'The wind smelled of lightning and torn pine boughs all afternoon while you lashed straw mats over the drying sheds. When the gale broke it sheared east along the river gorges, leaving only cool drops on the hot tiles and the ditches running clear.',
    long_fire:
      ' Watched a second time from the same window, which is the only way to learn anything.',
    rare: ' It came close enough once to be worth the story, and never closer.',
    tags: ['averted', 'weather'],
    templates: [
      {
        detail:
          'The air smelled of lightning and torn pine boughs all afternoon while you lashed straw over the drying sheds. Then the gale sheared east along the gorges and left you nothing but cool drops on hot tile.',
        tags: ['weather', 'shear'],
      },
      {
        name: 'Over the southern ridge',
        one_liner:
          'The black heads split above the ridge and went on south, and your drying mats got nothing.',
        detail:
          'You stood in the yard with the lash-rope in both hands and watched it go, and the relief was worse than the fear had been. Nothing was ruined. Nothing was saved either. You lashed the mats anyway.',
        tags: ['variant'],
      },
      {
        name: 'The straw mats, lashed',
        one_liner:
          'Every mat on the roof roped down before the wind found the gaps, and the hail landing four valleys away.',
        detail:
          'It is not a skill anyone teaches you. It is the sort of thing your hands know and you did not, and afterwards you cannot remember deciding to do it.',
        tags: ['variant'],
      },
    ],
  },
  {
    name: 'A guest ate',
    one_liner:
      'A drenched traveler took the stool by the charcoal brazier and emptied three bowls of hot millet without speaking.',
    subject: 'a traveler fed by the stove',
    detail:
      'He set down his dripping bamboo hat and accepted steamed buns straight from the basket with both hands. When he wiped the bowl clean with a scrap of cabbage leaf, the silence between you felt settled rather than strained.',
    long_fire: ' Fed twice, and the second bowl was not put away afterwards.',
    rare: ' They came, and they ate, and they came back, and that is the whole of it.',
    tags: ['guest', 'fed'],
    templates: [
      {
        detail:
          'He set down the dripping bamboo hat, took the steamed buns with both hands, and said nothing for {{count}}. When he wiped the bowl with a scrap of cabbage leaf the quiet between you felt settled rather than strained.',
        tags: ['guest', 'fire'],
      },
      {
        detail:
          'He set down the dripping bamboo hat, took the steamed buns with both hands, and said nothing for {{count}}. Outside, {{tie}} was still arguing about the price of rope.',
        tags: ['tie'],
      },
      {
        name: 'Three bowls of hot millet',
        one_liner:
          'A drenched stranger, the last of the millet, and a stool nobody had to be asked for.',
        detail:
          'He ate the way people eat when they have walked a long way in weather, and you sat down and let him get on with it, and that was the whole courtesy. The bowl went back on the rack unwashed for a while after.',
        tags: ['variant'],
      },
      {
        name: 'The hat on the flagstones',
        one_liner:
          'A bamboo hat set down steaming on cold stone, and a man who had walked here from the pass.',
        detail:
          'He left the hat where he dropped it and picked it up again when he was ready to go, and in between he said almost nothing, and you did not make him. The brazier is still warm.',
        tags: ['variant'],
      },
    ],
  },
  {
    name: 'A stray stayed',
    one_liner:
      'A scarred yellow cat curled over the warm kiln bricks, deciding the courtyard was worth defending.',
    subject: 'a stray settling by the kiln',
    detail:
      'After three days of watching from the perimeter wall, it hopped down to drink the skimmed whey you left in an earthen saucer. By nightfall it had found the hollow under the woodpile, curled fast against the draft with its tail tucked over its nose.',
    long_fire: ' It has been here long enough now that nobody thinks to ask how long.',
    rare: ' It has stopped being a visitor, which is a different thing entirely.',
    tags: ['stray', 'stayed'],
    templates: [
      {
        detail:
          'Three days on the perimeter wall, then down to the skimmed whey you left in an earthen saucer. By dark it had found the hollow under the woodpile and curled fast against the draft, tail over nose.',
        tags: ['kiln', 'stayed'],
      },
      {
        gate: 'uncommon',
        detail:
          'It sleeps on the warm bricks now and lets you lift the paw without complaint, which is a longer answer than you expected to get.',
      },
      {
        name: 'On the warm kiln bricks',
        one_liner: 'A scarred yellow cat, three days on the perimeter wall, and then a decision.',
        detail:
          'It drank the skimmed whey and went straight back up to the bricks it had been watching from, and it has been there every night since. Nobody in this house agreed to feed it. It never asked anyone to.',
        tags: ['variant'],
      },
      {
        name: 'The courtyard, defended',
        one_liner:
          'Something yellow and scarred now sleeps where the work ends and the lane begins.',
        detail:
          'You have stopped trying to work out what it wants. It sits where it sits, it eats what is put down, and the hands that used to try the drying racks have stopped coming by altogether.',
        tags: ['variant'],
      },
    ],
  },
  {
    name: 'A memory smoothed clean',
    one_liner: 'A slate given back to the rack with the writing taken out of it by water.',
    subject: 'a slate returned unmarked',
    detail:
      'The stone takes the writing back. Rinsed long enough, it holds nothing at all, and the next person to take it off the rack starts from the same blank grain you did.',
    long_fire:
      ' The grain is still dark and wet where the marks were, and the rack takes it without comment.',
    rare: ' Not one mark survived, and the attendant who washed it did not look at what was on it first.',
    tags: ['slate', 'water', 'release'],
    era: 'fantasy',
    templates: [
      {
        detail: 'You write, and then the canal has it, and the stone is only stone again.',
        tags: ['slate', 'water', 'writing'],
      },
      {
        detail:
          'The marks go soft at the edges first and then all at once, the way a word leaves a face you are not looking at.',
        tags: ['slate', 'water', 'release'],
      },
    ],
  },
  {
    name: 'The storm hedge grafted',
    one_liner: 'Two torn boughs bound wet, holding the boundary against the gale.',
    subject: 'blackthorn bound to blackthorn',
    detail:
      'A hedge is a wall that grows back. The graft holds because the two halves are the same plant and the same water is running through both.',
    long_fire:
      ' The bast is wet and tightening, and the two boughs have stopped arguing with each other.',
    rare: ' The join took in a single season, and the old scar is still visible under the new wood.',
    tags: ['hedge', 'gale', 'repair'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'You press the two boughs together and wrap them wet, and the wind tests the join and finds nothing loose.',
        tags: ['hedge', 'gale', 'bast'],
      },
      {
        detail:
          'The graft is holding where the flagstones stop, which is the only place on the boundary that has ever needed holding.',
        tags: ['hedge', 'gale', 'stone'],
      },
    ],
  },
  {
    name: 'A vow re-knotted',
    one_liner: 'An old pledge said aloud and pulled into a square knot in oiled cord.',
    subject: 'the same cord, tied again',
    detail:
      'A knot is a record you can carry and check without anyone keeping it for you. Spoken in front of witnesses, tied in your own hand, it holds in a way that ink does not.',
    long_fire:
      ' The square knot sits flush, and the oil makes the hemp grip the wire instead of sliding on it.',
    rare: ' The knot is the same one you tied before the crossing, pulled again rather than retied.',
    tags: ['vow', 'knot', 'cord'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'You say it out loud in front of the attendants and then pull the square knot flush, and the cord takes the words.',
        tags: ['vow', 'knot', 'cord'],
      },
      {
        detail:
          'The old knot will not lie flat again, so the new one is pulled beside it and the cord carries both.',
        tags: ['vow', 'knot', 'cord'],
      },
    ],
  },
  {
    name: 'Tea set for a stranger',
    one_liner: 'A cup set steaming on the sill and emptied without a question asked.',
    subject: 'a cup on the sill, steaming',
    detail:
      'Nobody is owed an account of who they are. The cup is set down, it is drunk, and the person who set it does not come back to ask how it was.',
    long_fire:
      ' The cup is still too hot to hold, and it was set down without a word about who it was for.',
    rare: ' The cup came back empty and rinsed, and nobody has ever asked who drank it.',
    tags: ['tea', 'stranger', 'sill'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'The cup is set on the sill in front of you and the steam goes straight up into the cold, and nobody says anything about it.',
        tags: ['tea', 'sill', 'stranger'],
      },
      {
        detail: 'You drink it down to the dregs because that is how much of it there is.',
        tags: ['tea', 'stranger', 'cold'],
      },
    ],
  },
  {
    name: 'The low gate left unlatched',
    one_liner: 'The bar resting on its bracket all night, and three people inside.',
    subject: 'the bar resting on its bracket',
    detail:
      'A gate that stays barred is a wall. Left resting on the bracket through the worst of the night, it is a decision about what the court is for.',
    long_fire:
      ' The bar is still on the bracket, exactly where it was put, and the cold has not moved it.',
    rare: ' Three sets of wet prints go in and none of them knocked.',
    tags: ['gate', 'night', 'latch'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'The bar never came off the bracket all night, and the flagstones inside are wet with three sets of prints.',
        tags: ['gate', 'night', 'latch'],
      },
      {
        detail: 'The latch is cold under your hand and has clearly been left alone for hours.',
        tags: ['gate', 'latch', 'night'],
      },
    ],
  },
  {
    name: 'The ledger closed in green',
    one_liner: 'An old account struck through in green chalk and tied shut with reed.',
    subject: 'an account ruled through',
    detail:
      'Green chalk on a tea-dark page is soft enough to be rubbed out by anyone who feels like trying. The reed is what stops it. The cord keeps the peace, not the chalk.',
    long_fire:
      ' The reed is split and tight, and the green stroke is broad enough that it will not fade to anything readable.',
    rare: ' The stroke goes corner to corner, and the reed holding it closed is new.',
    tags: ['ledger', 'green', 'closure'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'One broad stroke of green across the whole account, and then split reed through the binding so it will not open again.',
        tags: ['ledger', 'green', 'reed'],
      },
      {
        detail:
          'The account is tied shut and the page underneath it is a colour no one has needed in years.',
        tags: ['ledger', 'green', 'closure'],
      },
    ],
  },
];

const CHANGES: readonly CatalogEntry[] = [
  {
    name: 'A habit of returning',
    one_liner:
      "Your feet carry you across the gravel court to the joiner's bench before you decide what the day requires.",
    subject: 'an unthinking return to work',
    detail:
      'The morning bell no longer catches you hesitating at the threshold with cold hands. You light the small charcoal burner, wipe the night dew from the chisel blades, and find the timber already marked for the next cut.',
    long_fire:
      ' You have not missed a morning yet, and you stopped noticing the not-missing some time before you noticed the habit.',
    rare: ' A practice this old stops being a decision some weeks in, and starts being a thing that would have to be stopped deliberately.',
    tags: ['habit', 'return'],
    templates: [
      {
        detail:
          "The morning bell no longer catches you at the threshold. {{hour}} you are already at the joiner's bench with the burner lit and the blades wiped, and the timber marked before you have decided what the day is for.",
        tags: ['threshold', 'hands'],
      },
      {
        detail:
          'You go back to the same bench {{hour}} and take the same stool, and {{tie}} has stopped remarking on it.',
        tags: ['tie'],
      },
      {
        name: 'Across the gravel, again',
        one_liner:
          "Your feet arrive at the joiner's bench some seconds before you have decided anything.",
        detail:
          'The bell no longer catches you hesitating at the threshold. You are through the gate, across the gravel, and standing at the bench with your hand already on a blade before the thought of the day has finished forming.',
        tags: ['variant'],
      },
      {
        name: 'The timber already marked',
        one_liner:
          'You wake, and the next cut is notched where yesterday left it, and you have not yet opened your eyes to any of it.',
        detail:
          'Somewhere in the last year the marking stopped being your work and started being how you found your work waiting. You would not call it devotion. You would not correct anyone who did.',
        tags: ['variant'],
      },
    ],
  },
  {
    name: 'A lighter pack',
    one_liner:
      'You emptied the rusted tools and dead accounts from your wicker hamper before climbing the ridge.',
    subject: 'a shed weight on the mountain road',
    detail:
      'Half the provisions you hauled across three provinces turned out to be worries about roads you never took. You left the spare ironmongery with a village smith and walked on with only a bamboo water-tube and dry tea cakes.',
    long_fire: ' You packed it slower than it needed, and you would do it slower again.',
    rare: ' Nothing in it will break. That is the point of it.',
    tags: ['lighter', 'space'],
    templates: [
      {
        detail:
          'You left the spare ironmongery with a village smith and climbed on with a bamboo water-tube and dry tea cakes. The pack came down by more than its own weight; it came down by {{count}} you never spent on the roads you did not take.',
        tags: ['road', 'less'],
      },
      {
        name: 'What stayed at the bottom of the hamper',
        one_liner: 'Rusted tools, dead accounts, and a whole province of roads you never took.',
        detail:
          'You set them out on the ridge to see what you had been hauling, and it was not gear. It was a set of anxieties wearing the shape of gear, and the wind took the list faster than any river would.',
        tags: ['variant'],
      },
      {
        name: 'The roads you never took',
        one_liner:
          'Every mile of the crossing you worried about, and none of the miles you walked.',
        detail:
          'The roads were not what made the pack heavy. You know that now, and you have not entirely forgiven the roads, and you have stopped packing for them.',
        tags: ['variant'],
      },
    ],
  },
  {
    name: 'A sharper ear',
    one_liner:
      'You hear the faint ping of stressed iron before the wheel rim fractures on the mountain pass.',
    subject: 'an ear tuned to strained metal',
    detail:
      'Where others hear only road grit and creaking timber, you catch the dry whistle of an empty axle-box or the sudden hush of a bearing running hot. You can brake the cart while there is still stone beneath the tires.',
    long_fire: ' You gave it long enough, standing still, and it gave the rest back.',
    rare: ' There is not a second person on this road who can hear it, and you have stopped looking for one.',
    tags: ['notice', 'signal'],
    templates: [
      {
        detail:
          'Where others hear road grit and creaking timber, you catch the dry whistle of an empty axle-box, or the hush that means a bearing has gone hot. You can brake the cart with stone still under the tires.',
        tags: ['iron', 'warning'],
      },
      {
        detail:
          'You can hear the seam in a roof tile now from the lane below. {{tie}} thinks this is a party trick, and says so, and is partly right.',
        tags: ['tie'],
      },
      {
        name: 'The ping before the fracture',
        one_liner:
          'Stressed iron announces itself a good half-mile before it lets go, if anyone is listening.',
        detail:
          'You hear it now in a way you could not before, and it is not magic and it is not a gift. It is four years of stopping to look at the thing everyone else walked past, which turns out to be the whole mechanism.',
        tags: ['variant'],
      },
      {
        name: 'Under the road grit',
        one_liner:
          'Where there is only creak, there is a dry whistle from an empty axle-box, and it has been there all along.',
        detail:
          'You cannot switch it off. You have tried, at the market, at the well, in the middle of your own sentence. The world has more noise in it than it used to and you are simply the one standing still enough to notice.',
        tags: ['variant'],
      },
    ],
  },
  {
    name: 'A slower morning',
    one_liner:
      'You lay out your tools and brew a bowl of tea before the morning crowd starts shouting in the lane.',
    subject: 'a deliberate start to the day',
    detail:
      'Instead of tumbling into the alley at the first market drum, you trim the lamp and check every strap on your carrying basket. Taking that quiet half-hour to sit with hot tea prevents hasty packing and keeps fragile goods from spilling later on the road.',
    long_fire: ' You did not hurry it, and the morning is still there.',
    rare: ' You will do it again tomorrow, and you already know that.',
    tags: ['pace', 'morning'],
    templates: [
      {
        detail:
          'You trimmed the lamp and checked every strap on the carrying basket before the lane started shouting. You drink {{hour}} with hot tea, and nothing fragile has spilled on the road since.',
        tags: ['tea', 'before'],
      },
      {
        name: 'Before the first market drum',
        one_liner: 'Tools laid out, tea brewed, and the lane still not yet shouting at anyone.',
        detail:
          'You used to be in the alley before the drum finished, and something in you decided that being early was the same as being useful. It was not. The quarter-hour you take now buys more than the hour you used to save did.',
        tags: ['variant'],
      },
      {
        name: 'The kettle first',
        one_liner:
          'A bowl of tea, unasked for by anyone, at the top of a morning that used to begin in a run.',
        detail:
          'No one is waiting on you. The joiner has his own hands and the queue forms whether you are in it or not. You have made the tea anyway, and you have never once been late because of it.',
        tags: ['variant'],
      },
    ],
  },
  {
    name: 'You look for a second cup',
    one_liner:
      'Your hand draws two celadon cups from the drying rack every time the kettle comes to a boil.',
    subject: 'setting out two cups by instinct',
    detail:
      'Even when the workshop is empty at twilight, you wipe the rim of the second cup and place it opposite your bench. Someone almost always pushes the screen aside before the steam stops rising, as if drawn by the spare bowl.',
    long_fire: ' You have not stopped scanning the rack, and you are not going to.',
    rare: ' There has been a place set at your bench for a while now, and no one has mentioned it, which is its own kind of answer.',
    tags: ['habit', 'offering'],
    templates: [
      {
        detail:
          'Two celadon cups come off the drying rack before the kettle has finished, even when the workshop is empty at twilight. Someone almost always pushes the screen aside before the steam stops rising.',
        tags: ['cup', 'instinct'],
      },
      {
        gate: 'rare',
        flourish: 'You have stopped being startled by it.',
        detail:
          'The second cup is set out {{hour}} and wiped clean, and the reason has never once been the person you had in mind.',
      },
      {
        detail:
          'The second cup is set out {{hour}} and wiped clean, and the reason has never once been the person you had in mind. {{tie}} knows better and has not said so.',
        tags: ['tie'],
      },
      {
        name: 'Two cups, always',
        one_liner:
          'The second celadon cup comes off the rack before the kettle has finished, every time.',
        detail:
          'It stopped being a courtesy some while ago and became a question you ask yourself, and the answer is always yes. There is a place set at your bench. There has been for weeks.',
        tags: ['variant'],
      },
      {
        name: 'The cup opposite yours',
        one_liner: 'One cup, wiped, and set down across the bench in an empty workshop.',
        detail:
          'You do it with the room empty, which is the part that would not survive being examined. There is no one to give it to. You set it down anyway, and you notice when the wind moves it, and you put it back.',
        tags: ['variant'],
      },
    ],
  },
  {
    name: 'Hands calloused to the thorn',
    one_liner: 'Palms gone to horn-grain, so a blackthorn shoot can be gripped without opening.',
    subject: 'yellow horn-grain on the palms',
    detail:
      'It builds the way a callus does anywhere, except that here it is not an accident of work. The briar is the teacher and the grip is the lesson.',
    long_fire:
      ' The palms have gone the colour of the dry root, and the grip closes before you decide it should.',
    rare: ' You can close a hand on a blackthorn shoot now and the only cost is the sap.',
    tags: ['hands', 'thorn', 'grip'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'You take a blackthorn shoot in one hand without checking, and the grip holds and the skin does not open.',
        tags: ['hands', 'thorn', 'grip'],
      },
      {
        detail:
          'The horn-grain on the palms is thick enough that the sap has to be wiped off rather than washed out.',
        tags: ['hands', 'sap', 'thorn'],
      },
    ],
  },
  {
    name: 'Pace matched to the water',
    one_liner: 'A hurried stride slowed until the heel falls with the ripple.',
    subject: 'a step that waits for the ripple',
    detail:
      'It is not calm you have learned. It is a rhythm taken from something that was already moving slowly and had been moving slowly for a long time.',
    long_fire:
      ' The heel comes down with the ripple now, and the two have not disagreed all morning.',
    rare: ' The stride has slowed so far that the canal has become the clock.',
    tags: ['pace', 'water', 'ripple'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'You walk the flags and your heel comes down exactly when the ripple reaches the margin, and you did not decide that.',
        tags: ['pace', 'water', 'ripple'],
      },
      {
        detail:
          'The scramble is gone out of your walk, and what is left takes its time and does not hurry you.',
        tags: ['pace', 'water', 'walk'],
      },
    ],
  },
  {
    name: 'An ear for the single bell',
    one_liner: 'Street-startled ears turned to the three-minute hum inside one note.',
    subject: 'listening inside the hum',
    detail:
      'Three minutes is long enough to hear a second thing inside the first one. The street never gave you that, because the street never stopped.',
    long_fire:
      ' The three minutes are still running in the bowl, and you can hear the part of it you would have missed before.',
    rare: ' The hum has a node in it, and the node is where you can hear your own breathing.',
    tags: ['bell', 'listening', 'hum'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'The mallet lifts and the bowl goes on for three minutes, and you sit inside the sound instead of waiting for it to stop.',
        tags: ['bell', 'hum', 'listening'],
      },
      {
        detail:
          'Somewhere under the reverberation there is a place where the note turns over, and that is where you are listening from.',
        tags: ['bell', 'hum', 'note'],
      },
    ],
  },
  {
    name: 'Release of the ancestral roll',
    one_liner: 'The habit of searching the roll for names, set down and not taken up.',
    subject: 'both hands empty and free',
    detail:
      'The roll was never going to say anything it had not already said. The hands, once they stop checking, turn out to be good for carrying things to people.',
    long_fire: ' The hands are empty, and the emptiness is not a lack. It is just hands.',
    rare: ' The roll has not been opened in a long time, and the bread is out on the bench.',
    tags: ['roll', 'records', 'hands'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'You reach for the roll out of habit and then do not, and the bread goes out to the benches instead.',
        tags: ['roll', 'hands', 'bread'],
      },
      {
        detail:
          'Both hands are free and carrying something, which is a better use of them than turning pages.',
        tags: ['hands', 'roll', 'bread'],
      },
    ],
  },
  {
    name: 'Tolerance for cold limestone',
    one_liner: "A body that will sit still on cold stone through another person's grief.",
    subject: 'a heavy stillness on the stone',
    detail:
      'Cold stone is not the problem. The problem is staying on it while someone else is in trouble, and a body that will not stop shivering cannot do that.',
    long_fire:
      ' The damp has stopped being cold, and the weight is doing the work the shivering was doing.',
    rare: ' You sat through a whole watch on that stone and your back never once complained.',
    tags: ['stone', 'stillness', 'grief'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'You sit on the cold flags and the shudder never comes, and the weight of you is simply there.',
        tags: ['stone', 'stillness', 'cold'],
      },
      {
        detail:
          'Somebody else has been in grief for hours and you have stayed on the stone the whole time.',
        tags: ['stone', 'grief', 'stillness'],
      },
    ],
  },
  {
    name: 'Breath steadied at the boundary',
    one_liner: 'The panic at the ditch edge settling into a counted rhythm.',
    subject: 'a measured rhythm behind the ribs',
    detail:
      'The void does not change. What changes is the count behind the ribs, and past a certain number of counts the looking becomes survivable.',
    long_fire: ' The breath has found its count, and the void is still exactly as loud as it was.',
    rare: ' The rhythm is low enough now that you can hold it across the whole width of the ditch.',
    tags: ['breath', 'boundary', 'void'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'You look into the void and the breath behind the ribs keeps its own count and does not follow the noise.',
        tags: ['breath', 'void', 'boundary'],
      },
      {
        detail:
          'The panic comes up to the edge of the ditch and stops there, because you have counted past it.',
        tags: ['breath', 'boundary', 'void'],
      },
    ],
  },
];

const PEOPLE: readonly CatalogEntry[] = [
  {
    name: 'Shen the night clerk',
    era: 'tang',
    one_liner:
      'He works his abacus by tallow dip, noting tea and grain before you recall what was spent.',
    subject: 'a keeper of small debts',
    detail:
      'His abacus clicks long past the market curfew while moth wings flutter around the tallow dip. He leaves the back shutter unbolted for late grain porters, charging only what was weighed and never a copper for the late hour.',
    long_fire:
      ' He stayed on past the curfew to finish the column, and did not mention it to anyone.',
    rare: ' He has not missed a night in nineteen years, and the ledger knows it better than he does.',
    tags: ['clerk', 'debts'],
    templates: [
      {
        detail:
          'His abacus clicks long past the curfew while moth wings work around the tallow dip. {{hour}} he leaves the back shutter unbolted for late grain porters and charges only what was weighed.',
        tags: ['abacus', 'late'],
      },
      {
        detail:
          'He knows which jars you under-fill, and has never once said so out loud. Whatever else {{tie}} keeps quiet about, it is not that.',
        tags: ['tie'],
      },
      {
        name: 'The column he finished after the curfew',
        one_liner: 'His abacus is still clicking long after the market has gone dark.',
        gate: 'uncommon',
        long_fire:
          ' He went back over the fourth column after the ledger was shut, and the fifth, and then he shut it again.',
        rare: ' There is one column in that ledger he has never once got wrong, and it is the one nobody reads.',
        detail:
          'The last three columns of the night are the ones nobody checks, and he checks them twice, and the reason he checks them twice is that a wrong figure at the fourth hour is found by someone who cannot fix it.',
        tags: ['column', 'abacus', 'fourth hour'],
      },
      {
        name: 'The column he finished after the curfew',
        one_liner: 'His abacus is still clicking long after the market has gone dark.',
        gate: 'uncommon',
        long_fire:
          ' He wrote the whole thing out in the book so that it existed, which is more than the boy asked for.',
        rare: ' He has never refused a boy anything and has never once made it look like a favour.',
        detail:
          'A boy comes in at the second hour to ask for something he has no right to ask for. He writes it down, which is the answer, and the boy does not understand that and is told anyway.',
        tags: ['boy', 'second hour', 'ledger'],
      },
      {
        name: 'The column he finished after the curfew',
        one_liner: 'His abacus is still clicking long after the market has gone dark.',
        gate: 'rare',
        long_fire:
          ' He read the whole day back and did not find anything, and sat with that for a while.',
        rare: ' He has caught two errors in nineteen years and one of them was in his own hand.',
        detail:
          'At closing he reads the day back through once without expression, the way a man reads a road he has walked a thousand times and still checks for the part that has moved.',
        tags: ['closing', 'reading', 'road'],
      },
    ],
  },
  {
    name: 'Zhao the early courier',
    one_liner:
      'He arrives while frost still silvers the gate latch, smelling of road dust and river mist.',
    subject: 'a courier ahead of schedule',
    detail:
      "His pony's breath clouds the cold courtyard while he slices the oiled twine around your parcel. He waves off the hot tea you offer, already tightening his girth strap to beat the morning packet boat downriver.",
    long_fire:
      ' He waited out the weather with the parcel under his coat, and said nothing about the time it cost him.',
    rare: ' He rides the long way whatever the hour, and there is no parcel in this city he will not carry.',
    tags: ['courier', 'early'],
    templates: [
      {
        detail:
          "His pony's breath clouds the cold yard while he cuts the oiled twine off your parcel. He waves off the tea you offer, already tightening the girth strap to beat the morning packet boat downriver.",
        tags: ['cold', 'before'],
      },
      {
        name: 'The long way round, in the rain',
        one_liner: 'He cuts the twine and the parcel is dry, and so is everything else in it.',
        gate: 'uncommon',
        long_fire: ' He went the long way in the rain and arrived early, and does that every time.',
        rare: ' He has not lost a parcel in twenty years, and he has been rained on four thousand.',
        detail:
          'The rain comes in sideways off the wall and the road turns to soup two miles short of the gate. He does not complain about it, because he has been doing this since before the gate had a name, and he goes the long way around.',
        tags: ['rain', 'road', 'gate'],
      },
      {
        name: 'The long way round, in the rain',
        one_liner: 'He cuts the twine and the parcel is dry, and so is everything else in it.',
        gate: 'uncommon',
        long_fire:
          ' He waited the whole time the man was deciding, and did not once look away from the road.',
        rare: ' Not one of his parcels has been opened, and he does not know what any of them say.',
        detail:
          'A householder asks whether the sealed letter has been opened. He hands it across, seal up, and waits while the man looks at it, and then he takes it back and goes.',
        tags: ['letter', 'seal', 'householder'],
      },
      {
        name: 'The long way round, in the rain',
        one_liner: 'He cuts the twine and the parcel is dry, and so is everything else in it.',
        gate: 'rare',
        long_fire: ' He was on the wall before the gate opened and again after it closed.',
        rare: ' He has ridden out of this city more times than the city has had a gatekeeper.',
        detail:
          '{{hour}} he is at the gate before it is opened, sitting on the wall with his pony, and he has been there since before there was anything to sit there for.',
        tags: ['gate', 'pony', 'wall'],
      },
    ],
  },
  {
    name: 'Auntie Qian the keyholder',
    one_liner: 'She keeps your spare iron key on a braided cord behind her kitchen hearth.',
    subject: 'a neighbor holding a key',
    detail:
      'The heavy latch-key hangs beside her dried peppers, turned once during an autumn flood to save your flour sacks. She never mentions the favor, but always checks your chimney smoke before lighting her own morning stove.',
    long_fire:
      ' She turned the lock twice before she let you in, which is her way of saying she was waiting.',
    rare: ' There is one of these keys, and she has never had it copied, and she has never had to.',
    tags: ['neighbor', 'key'],
    templates: [
      {
        detail:
          'Your spare iron key lives on a braided cord behind her hearth, where the smoke keeps it from rusting. She hangs it on the nail {{hour}}, and she is the only reason a locked door is not a closed life.',
        tags: ['key', 'hearth'],
      },
      {
        detail:
          'She hangs the key on the nail {{hour}} and looks at the door the way other people look at weather. {{tie}} was the last person outside to be given one.',
        tags: ['tie'],
      },
      {
        name: 'The key she turns twice',
        one_liner:
          'The heavy latch-key hangs beside the dried peppers, and it is not for the door it opens.',
        gate: 'rare',
        long_fire: ' She went down in the flood with the key already out and did not hurry once.',
        rare: ' She has opened a door that was not hers in a year when every door in the quarter was under water.',
        detail:
          "In the flood year the water came to the third step and she turned that key and went down to the neighbour's cellar, and the neighbour's cellar is dry, and nobody has ever established how she knew.",
        tags: ['flood', 'cellar', 'step'],
      },
      {
        name: 'The key she turns twice',
        one_liner:
          'The heavy latch-key hangs beside the dried peppers, and it is not for the door it opens.',
        gate: 'uncommon',
        long_fire: ' She held the key another year and said the thing she says every year.',
        rare: ' Four households have never once been locked out, in a quarter where that is not normal.',
        detail:
          'She holds the key for four households on the lane, and the argument about whose turn it is to be given it is an old one and is settled annually, in the same way, in the same week.',
        tags: ['key', 'lane', 'households'],
      },
      {
        name: 'The key she turns twice',
        one_liner:
          'The heavy latch-key hangs beside the dried peppers, and it is not for the door it opens.',
        gate: 'uncommon',
        long_fire:
          ' She has said nothing about any of this for eleven years and nobody has thought to ask.',
        rare: ' She keeps a thing for everybody on that lane and has never named the arrangement.',
        detail:
          'The dried peppers are for keeping, not for eating, and the key is for the cellar, and both of these facts are known to everybody on the lane and neither is ever explained.',
        tags: ['peppers', 'cellar', 'keeping'],
      },
      {
        one_liner:
          'The heavy latch-key hangs beside the dried peppers, and it is not for the door it opens.',
        long_fire: ' She went down in the flood with the key already out and did not hurry once.',
        rare: ' She has opened a door that was not hers in a year when every door in the quarter was under water.',
        detail:
          "In the flood year the water came to the third step and she turned that key and went down to the neighbour's cellar, and the neighbour's cellar is dry, and nobody has ever established how she knew.",
        tags: ['flood', 'cellar', 'step'],
      },
      {
        one_liner:
          'The heavy latch-key hangs beside the dried peppers, and it is not for the door it opens.',
        long_fire: ' She held the key another year and said the thing she says every year.',
        rare: ' Four households have never once been locked out, in a quarter where that is not normal.',
        detail:
          'She holds the key for four households on the lane, and the argument about whose turn it is to be given it is an old one and is settled annually, in the same way, in the same week.',
        tags: ['key', 'lane', 'households'],
      },
      {
        one_liner:
          'The heavy latch-key hangs beside the dried peppers, and it is not for the door it opens.',
        long_fire:
          ' She has said nothing about any of this for eleven years and nobody has thought to ask.',
        rare: ' She keeps a thing for everybody on that lane and has never named the arrangement.',
        detail:
          'The dried peppers are for keeping, not for eating, and the key is for the cellar, and both of these facts are known to everybody on the lane and neither is ever explained.',
        tags: ['peppers', 'cellar', 'keeping'],
      },
      {
        one_liner:
          'The heavy latch-key hangs beside the dried peppers, and it is not for the door it opens.',
        long_fire: ' She went down in the flood with the key already out and did not hurry once.',
        rare: ' She has opened a door that was not hers in a year when every door in the quarter was under water.',
        detail:
          "In the flood year the water came to the third step and she turned that key and went down to the neighbour's cellar, and the neighbour's cellar is dry, and nobody has ever established how she knew.",
        tags: ['flood', 'cellar', 'step'],
      },
      {
        one_liner:
          'The heavy latch-key hangs beside the dried peppers, and it is not for the door it opens.',
        long_fire: ' She held the key another year and said the thing she says every year.',
        rare: ' Four households have never once been locked out, in a quarter where that is not normal.',
        detail:
          'She holds the key for four households on the lane, and the argument about whose turn it is to be given it is an old one and is settled annually, in the same way, in the same week.',
        tags: ['key', 'lane', 'households'],
      },
      {
        one_liner:
          'The heavy latch-key hangs beside the dried peppers, and it is not for the door it opens.',
        long_fire:
          ' She has said nothing about any of this for eleven years and nobody has thought to ask.',
        rare: ' She keeps a thing for everybody on that lane and has never named the arrangement.',
        detail:
          'The dried peppers are for keeping, not for eating, and the key is for the cellar, and both of these facts are known to everybody on the lane and neither is ever explained.',
        tags: ['peppers', 'cellar', 'keeping'],
      },
      {
        one_liner:
          'The heavy latch-key hangs beside the dried peppers, and it is not for the door it opens.',
        long_fire: ' She went down in the flood with the key already out and did not hurry once.',
        rare: ' She has opened a door that was not hers in a year when every door in the quarter was under water.',
        detail:
          "In the flood year the water came to the third step and she turned that key and went down to the neighbour's cellar, and the neighbour's cellar is dry, and nobody has ever established how she knew.",
        tags: ['flood', 'cellar', 'step'],
      },
      {
        one_liner:
          'The heavy latch-key hangs beside the dried peppers, and it is not for the door it opens.',
        long_fire: ' She held the key another year and said the thing she says every year.',
        rare: ' Four households have never once been locked out, in a quarter where that is not normal.',
        detail:
          'She holds the key for four households on the lane, and the argument about whose turn it is to be given it is an old one and is settled annually, in the same way, in the same week.',
        tags: ['key', 'lane', 'households'],
      },
      {
        one_liner:
          'The heavy latch-key hangs beside the dried peppers, and it is not for the door it opens.',
        long_fire:
          ' She has said nothing about any of this for eleven years and nobody has thought to ask.',
        rare: ' She keeps a thing for everybody on that lane and has never named the arrangement.',
        detail:
          'The dried peppers are for keeping, not for eating, and the key is for the cellar, and both of these facts are known to everybody on the lane and neither is ever explained.',
        tags: ['peppers', 'cellar', 'keeping'],
      },
      {
        one_liner:
          'The heavy latch-key hangs beside the dried peppers, and it is not for the door it opens.',
        long_fire: ' She went down in the flood with the key already out and did not hurry once.',
        rare: ' She has opened a door that was not hers in a year when every door in the quarter was under water.',
        detail:
          "In the flood year the water came to the third step and she turned that key and went down to the neighbour's cellar, and the neighbour's cellar is dry, and nobody has ever established how she knew.",
        tags: ['flood', 'cellar', 'step'],
      },
      {
        one_liner:
          'The heavy latch-key hangs beside the dried peppers, and it is not for the door it opens.',
        long_fire: ' She held the key another year and said the thing she says every year.',
        rare: ' Four households have never once been locked out, in a quarter where that is not normal.',
        detail:
          'She holds the key for four households on the lane, and the argument about whose turn it is to be given it is an old one and is settled annually, in the same way, in the same week.',
        tags: ['key', 'lane', 'households'],
      },
      {
        one_liner:
          'The heavy latch-key hangs beside the dried peppers, and it is not for the door it opens.',
        long_fire:
          ' She has said nothing about any of this for eleven years and nobody has thought to ask.',
        rare: ' She keeps a thing for everybody on that lane and has never named the arrangement.',
        detail:
          'The dried peppers are for keeping, not for eating, and the key is for the cellar, and both of these facts are known to everybody on the lane and neither is ever explained.',
        tags: ['peppers', 'cellar', 'keeping'],
      },
      {
        one_liner:
          'The heavy latch-key hangs beside the dried peppers, and it is not for the door it opens.',
        detail:
          "In the flood year the water came to the third step and she turned that key and went down to the neighbour's cellar, and the neighbour's cellar is dry, and nobody has ever established how she knew.",
        tags: ['flood', 'cellar', 'step'],
        long_fire: ' She went down in the flood with the key already out and did not hurry once.',
        rare: ' She has opened a door that was not hers in a year when every door in the quarter was under water.',
      },
      {
        one_liner:
          'The heavy latch-key hangs beside the dried peppers, and it is not for the door it opens.',
        detail:
          'She holds the key for four households on the lane, and the argument about whose turn it is to be given it is an old one and is settled annually, in the same way, in the same week.',
        tags: ['key', 'lane', 'households'],
        long_fire: ' She held the key another year and said the thing she says every year.',
        rare: ' Four households have never once been locked out, in a quarter where that is not normal.',
      },
      {
        one_liner:
          'The heavy latch-key hangs beside the dried peppers, and it is not for the door it opens.',
        detail:
          'The dried peppers are for keeping, not for eating, and the key is for the cellar, and both of these facts are known to everybody on the lane and neither is ever explained.',
        tags: ['peppers', 'cellar', 'keeping'],
        long_fire:
          ' She has said nothing about any of this for eleven years and nobody has thought to ask.',
        rare: ' She keeps a thing for everybody on that lane and has never named the arrangement.',
      },
    ],
  },
  {
    name: 'Old Lu the ferry counter',
    era: 'tang',
    one_liner:
      'He notches his willow tally-stick for every cart and mendicant that boards the barge.',
    subject: 'a counter of crossings',
    detail:
      'He stands on the gravel slip with hemp cords knotted around his wrist, balancing peasant grain carts against mule litters. When the muddy current swells, he holds the stern rope with his boot until every passenger sits safe.',
    long_fire: ' He re-knotted the cord twice, and neither time was the knot loose.',
    rare: ' Every crossing on this river goes through his hands, and he has never once weighed a man short.',
    tags: ['ferry', 'tally'],
    templates: [
      {
        name: 'Grain on one side, and no short weight',
        one_liner:
          'He balances peasant grain across a gravel slip and has never once weighed a man short.',
        gate: 'uncommon',
        long_fire:
          ' He put the heavy basket on the far side again, and the ferryman did not thank him for it, because that is the arrangement.',
        rare: ' He has balanced every load on this slip for thirty years and not one has gone short.',
        detail:
          "He balances the load in two baskets at a time and puts the heavier one on the ferryman's side. This is not politeness. It is a practice kept since before the current was, and he would be harder to argue with about it than about anything.",
        tags: ['basket', 'grain', 'balance'],
      },
      {
        name: 'Grain on one side, and no short weight',
        one_liner:
          'He balances peasant grain across a gravel slip and has never once weighed a man short.',
        gate: 'uncommon',
        long_fire:
          ' He put a stone in the basket so it would not be taken as a full one, and went back to his work.',
        rare: ' He has added a stone to more baskets than anyone has counted, and never once said why.',
        detail:
          'A man with a full load looks at the water and then at the counter, and Lu takes the basket off, and puts a stone in it, and sends it over. He does not explain and is not asked to.',
        tags: ['water', 'counter', 'load'],
      },
      {
        name: 'Grain on one side, and no short weight',
        one_liner:
          'He balances peasant grain across a gravel slip and has never once weighed a man short.',
        gate: 'rare',
        long_fire:
          ' He answered four people in the time it took him to cross the slip twice, and got all four right.',
        rare: ' On the worst day of the flood season he did not sit down once.',
        detail:
          '{{hour}} the crossing is busy and he is doing four things at once, and if you ask him anything he tells you the answer while his hands keep going, and the answer is right.',
        tags: ['crossing', 'busy', 'hands'],
      },
      {
        one_liner:
          'He balances peasant grain across a gravel slip and has never once weighed a man short.',
        long_fire:
          ' He put the heavy basket on the far side again, and the ferryman did not thank him for it, because that is the arrangement.',
        rare: ' He has balanced every load on this slip for thirty years and not one has gone short.',
        detail:
          "He balances the load in two baskets at a time and puts the heavier one on the ferryman's side. This is not politeness. It is a practice kept since before the current was, and he would be harder to argue with about it than about anything.",
        tags: ['basket', 'grain', 'balance'],
      },
      {
        one_liner:
          'He balances peasant grain across a gravel slip and has never once weighed a man short.',
        long_fire:
          ' He put a stone in the basket so it would not be taken as a full one, and went back to his work.',
        rare: ' He has added a stone to more baskets than anyone has counted, and never once said why.',
        detail:
          'A man with a full load looks at the water and then at the counter, and Lu takes the basket off, and puts a stone in it, and sends it over. He does not explain and is not asked to.',
        tags: ['water', 'counter', 'load'],
      },
      {
        one_liner:
          'He balances peasant grain across a gravel slip and has never once weighed a man short.',
        long_fire:
          ' He answered four people in the time it took him to cross the slip twice, and got all four right.',
        rare: ' On the worst day of the flood season he did not sit down once.',
        detail:
          '{{hour}} the crossing is busy and he is doing four things at once, and if you ask him anything he tells you the answer while his hands keep going, and the answer is right.',
        tags: ['crossing', 'busy', 'hands'],
      },
      {
        one_liner:
          'He balances peasant grain across a gravel slip and has never once weighed a man short.',
        long_fire:
          ' He put the heavy basket on the far side again, and the ferryman did not thank him for it, because that is the arrangement.',
        rare: ' He has balanced every load on this slip for thirty years and not one has gone short.',
        detail:
          "He balances the load in two baskets at a time and puts the heavier one on the ferryman's side. This is not politeness. It is a practice kept since before the current was, and he would be harder to argue with about it than about anything.",
        tags: ['basket', 'grain', 'balance'],
      },
      {
        one_liner:
          'He balances peasant grain across a gravel slip and has never once weighed a man short.',
        long_fire:
          ' He put a stone in the basket so it would not be taken as a full one, and went back to his work.',
        rare: ' He has added a stone to more baskets than anyone has counted, and never once said why.',
        detail:
          'A man with a full load looks at the water and then at the counter, and Lu takes the basket off, and puts a stone in it, and sends it over. He does not explain and is not asked to.',
        tags: ['water', 'counter', 'load'],
      },
      {
        one_liner:
          'He balances peasant grain across a gravel slip and has never once weighed a man short.',
        long_fire:
          ' He answered four people in the time it took him to cross the slip twice, and got all four right.',
        rare: ' On the worst day of the flood season he did not sit down once.',
        detail:
          '{{hour}} the crossing is busy and he is doing four things at once, and if you ask him anything he tells you the answer while his hands keep going, and the answer is right.',
        tags: ['crossing', 'busy', 'hands', 'morning', 'dusk', 'evening', 'night', 'hour'],
      },
      {
        one_liner:
          'He balances peasant grain across a gravel slip and has never once weighed a man short.',
        long_fire:
          ' He put the heavy basket on the far side again, and the ferryman did not thank him for it, because that is the arrangement.',
        rare: ' He has balanced every load on this slip for thirty years and not one has gone short.',
        detail:
          "He balances the load in two baskets at a time and puts the heavier one on the ferryman's side. This is not politeness. It is a practice kept since before the current was, and he would be harder to argue with about it than about anything.",
        tags: ['basket', 'grain', 'balance'],
      },
      {
        one_liner:
          'He balances peasant grain across a gravel slip and has never once weighed a man short.',
        long_fire:
          ' He put a stone in the basket so it would not be taken as a full one, and went back to his work.',
        rare: ' He has added a stone to more baskets than anyone has counted, and never once said why.',
        detail:
          'A man with a full load looks at the water and then at the counter, and Lu takes the basket off, and puts a stone in it, and sends it over. He does not explain and is not asked to.',
        tags: ['water', 'counter', 'load'],
      },
      {
        one_liner:
          'He balances peasant grain across a gravel slip and has never once weighed a man short.',
        long_fire:
          ' He answered four people in the time it took him to cross the slip twice, and got all four right.',
        rare: ' On the worst day of the flood season he did not sit down once.',
        detail:
          '{{hour}} the crossing is busy and he is doing four things at once, and if you ask him anything he tells you the answer while his hands keep going, and the answer is right.',
        tags: ['crossing', 'busy', 'hands', 'morning', 'dusk', 'evening', 'night', 'hour'],
      },
      {
        one_liner:
          'He balances peasant grain across a gravel slip and has never once weighed a man short.',
        long_fire:
          ' He put the heavy basket on the far side again, and the ferryman did not thank him for it, because that is the arrangement.',
        rare: ' He has balanced every load on this slip for thirty years and not one has gone short.',
        detail:
          "He balances the load in two baskets at a time and puts the heavier one on the ferryman's side. This is not politeness. It is a practice kept since before the current was, and he would be harder to argue with about it than about anything.",
        tags: ['basket', 'grain', 'balance'],
      },
      {
        one_liner:
          'He balances peasant grain across a gravel slip and has never once weighed a man short.',
        long_fire:
          ' He put a stone in the basket so it would not be taken as a full one, and went back to his work.',
        rare: ' He has added a stone to more baskets than anyone has counted, and never once said why.',
        detail:
          'A man with a full load looks at the water and then at the counter, and Lu takes the basket off, and puts a stone in it, and sends it over. He does not explain and is not asked to.',
        tags: ['water', 'counter', 'load'],
      },
      {
        one_liner:
          'He balances peasant grain across a gravel slip and has never once weighed a man short.',
        long_fire:
          ' He answered four people in the time it took him to cross the slip twice, and got all four right.',
        rare: ' On the worst day of the flood season he did not sit down once.',
        detail:
          '{{hour}} the crossing is busy and he is doing four things at once, and if you ask him anything he tells you the answer while his hands keep going, and the answer is right.',
        tags: ['crossing', 'busy', 'hands', 'morning', 'dusk', 'evening', 'night', 'hour'],
      },
      {
        one_liner:
          'He balances peasant grain across a gravel slip and has never once weighed a man short.',
        detail:
          "He balances the load in two baskets at a time and puts the heavier one on the ferryman's side. This is not politeness. It is a practice kept since before the current was, and he would be harder to argue with about it than about anything.",
        tags: ['basket', 'grain', 'balance'],
        long_fire:
          ' He put the heavy basket on the far side again, and the ferryman did not thank him for it, because that is the arrangement.',
        rare: ' He has balanced every load on this slip for thirty years and not one has gone short.',
      },
      {
        one_liner:
          'He balances peasant grain across a gravel slip and has never once weighed a man short.',
        detail:
          'A man with a full load looks at the water and then at the counter, and Lu takes the basket off, and puts a stone in it, and sends it over. He does not explain and is not asked to.',
        tags: ['water', 'counter', 'load'],
        long_fire:
          ' He put a stone in the basket so it would not be taken as a full one, and went back to his work.',
        rare: ' He has added a stone to more baskets than anyone has counted, and never once said why.',
      },
      {
        one_liner:
          'He balances peasant grain across a gravel slip and has never once weighed a man short.',
        detail:
          '{{hour}} the crossing is busy and he is doing four things at once, and if you ask him anything he tells you the answer while his hands keep going, and the answer is right.',
        tags: ['crossing', 'busy', 'hands', 'morning', 'dusk', 'evening', 'night', 'hour'],
        long_fire:
          ' He answered four people in the time it took him to cross the slip twice, and got all four right.',
        rare: ' On the worst day of the flood season he did not sit down once.',
      },
    ],
  },
  {
    name: 'Master Yan the quiet mender',
    one_liner: 'He binds splintered garden hurdles with peeled willow before anyone asks.',
    subject: 'an unasked mender',
    detail:
      'He carries an adze and a coil of split bamboo tucked into his hemp sash. You wake to find the garden gate swinging true on greased leather hinges, with only clean cedar shavings left on the swept flagstones.',
    long_fire: ' He worked it twice, and would not take the second as payment.',
    rare: ' He has mended the same gate-hung for three owners and will mend it for a fourth, and his price has not moved in twenty years.',
    tags: ['mender', 'unasked'],
    templates: [
      {
        detail:
          'He works with the door pushed to and does not look up while he sews. {{hour}} you bring him the torn thing and take it back mended, and neither of you treats it as conversation.',
        tags: ['needle', 'quiet'],
      },
      {
        detail:
          'He works with the door pushed to and does not look up while he sews. If {{tie}} brought you here, you will not be told so.',
        tags: ['tie'],
      },
      {
        name: 'The gate-hung, three owners deep',
        one_liner:
          'He has mended the same gate for three households and will not take more for it.',
        gate: 'uncommon',
        long_fire:
          ' He mended the same hung again and did not charge for it, and did not say that he would not.',
        rare: ' That gate has been mended by him for longer than it has hung on the same hinge.',
        detail:
          'He has mended the same gate-hung for three owners. He will do it again for a fourth, and the price has not moved in twenty years, and he says so the same way every time, which is to say once, and then not again.',
        tags: ['gate', 'mended', 'price'],
      },
      {
        name: 'The gate-hung, three owners deep',
        one_liner:
          'He has mended the same gate for three households and will not take more for it.',
        gate: 'uncommon',
        long_fire:
          ' He put the tools down before he touched the work, and picked them up again after.',
        rare: ' He has never once been seen carrying a bag, and he has mended everything.',
        detail:
          'An adze and a coil of split bamboo, tucked in the sash, are the whole of what he carries. He sets the tools down before he picks up the broken thing, which is a habit and not a courtesy.',
        tags: ['adze', 'bamboo', 'tools'],
      },
      {
        name: 'The gate-hung, three owners deep',
        one_liner:
          'He has mended the same gate for three households and will not take more for it.',
        gate: 'rare',
        long_fire:
          " He finished the other man's work without undoing any of it, which is the hardest thing to do.",
        rare: ' He has never once told anyone their mend was wrong, and has changed the grain direction to suit it.',
        detail:
          'The thing brought to him is always already half-mended by someone else. He does not take it apart to look. He mends what the other person stopped at.',
        tags: ['broken', 'half-mended', 'work'],
      },
    ],
  },
  {
    name: 'Old Wu the courtyard guest',
    one_liner: 'A stray tortoiseshell hound that sleeps under the tool shed and watches the gate.',
    subject: 'a being in the yard',
    detail:
      'He takes steamed bun crusts from your palm with soft jaws, never barking at late arrivals. By midday he curls over the warm flagstones where the sun hits, keeping sparrows away from your medicinal herbs with a single tail-thump.',
    long_fire: ' He waited out the whole storm on the step, and did not ask to be let in.',
    rare: ' He is the only living thing on this lane that has never once been hungry here, and there is a reason.',
    tags: ['guest', 'yard'],
    templates: [
      {
        name: 'The one who was already there',
        one_liner: 'He takes bun crusts from your palm and never barks at a late arrival.',
        gate: 'uncommon',
        long_fire: ' He was on the warm part of the step before the household had counted itself.',
        rare: ' He was at that gate before the gate was hung, and the household has never owned him.',
        detail:
          'He is on the step before the household has decided who else is staying, and the step is warm from the afternoon and he is in the warm part of it, and this is a position he holds deliberately.',
        tags: ['step', 'warm', 'household'],
      },
      {
        name: 'The one who was already there',
        one_liner: 'He takes bun crusts from your palm and never barks at a late arrival.',
        gate: 'uncommon',
        long_fire:
          ' He did not bark, and the household did not ask him to not bark, and both of those are the arrangement.',
        rare: ' He has never once barked at anybody coming in, and nobody can say when he decided that.',
        detail:
          'A stranger comes in late, and Old Wu does not bark, and the household does not ask why, and the stranger stays for the night without anyone having agreed to it.',
        tags: ['stranger', 'late', 'night'],
      },
      {
        name: 'The one who was already there',
        one_liner: 'He takes bun crusts from your palm and never barks at a late arrival.',
        gate: 'rare',
        long_fire:
          ' He had not moved off the paving all day, which meant something to the people who knew how to read it.',
        rare: ' He chooses the paving and not the mat, and the household has learned to read which.',
        detail:
          '{{hour}} he eats off the ground, on the paving, in the same three places, and whichever one he is in tells you what kind of day the household has had.',
        tags: ['paving', 'ground', 'hour'],
      },
    ],
  },
  {
    name: 'Elder Cui the evening caller',
    one_liner: 'He taps his cane on the threshold at dusk and sits without demanding conversation.',
    subject: 'someone at the door',
    detail:
      'He steps inside with damp sleeves as the evening temple bell rings, setting a small basket of roasted chestnuts on the low table. He sips bitter tea in silence, watching the wick gutter, leaving you feeling less alone in the house.',
    long_fire: ' He came in from the last of the rain and stayed past the second bell, talking.',
    rare: ' He has called the evening at this temple for longer than the bell has hung there, and the two are not unrelated.',
    tags: ['caller', 'evening'],
    templates: [
      {
        name: 'The bell and the man who matches it',
        one_liner:
          'He calls the evening as the temple bell rings, and has for longer than the bell has hung.',
        gate: 'uncommon',
        long_fire:
          ' He matched the call to the bell again, and the bell has not been re-hung in fifty years.',
        rare: ' The temple has kept his hour, not the other way round, and both sides know it.',
        detail:
          'The bell is rung and he calls the evening, and they are not two things that happen to coincide. He has matched his voice to that bell for so long that the temple staff set the hour by whichever of the two arrives first.',
        tags: ['bell', 'voice', 'evening'],
      },
      {
        name: 'The bell and the man who matches it',
        one_liner:
          'He calls the evening as the temple bell rings, and has for longer than the bell has hung.',
        gate: 'uncommon',
        long_fire:
          ' He carried the basket in and set it down and left without staying for the answer.',
        rare: ' He has fed more households through that basket than he has ever slept in.',
        detail:
          'A basket of river fish arrives with him every evening and goes out again by morning, and the household that cooks from it is not always the household he sleeps in.',
        tags: ['basket', 'fish', 'household'],
      },
      {
        name: 'The bell and the man who matches it',
        one_liner:
          'He calls the evening as the temple bell rings, and has for longer than the bell has hung.',
        gate: 'rare',
        long_fire: ' He called the whole evening in the rain and did not shorten it by one word.',
        rare: ' On the wet nights he calls longer, and the river people have counted it.',
        detail:
          'He calls in a cold rain with his sleeves wet through, and the calling is louder for it, and the households that are lit come to the door, and the ones that are not stay shut and that is also accounted for.',
        tags: ['rain', 'sleeves', 'door'],
      },
    ],
  },
  {
    name: 'Brother De the water-carrier',
    one_liner:
      'He balances twin cedar buckets from the public cistern, filling the neighborhood vats first.',
    subject: 'a carrier of water',
    detail:
      "His shoulder-pole creaks under heavy pails through every morning frost. He dumps clear spring water into the communal crock and the baker's trough before drawing a single ladle for his own kettle, humming an old boatman chant.",
    long_fire: ' He made the climb twice without being asked the second time.',
    rare: ' There is no spring in this quarter that he does not fill, and no household that has gone thirsty in his lifetime.',
    tags: ['water', 'carrier'],
    templates: [
      {
        detail:
          'He knows which jars you under-fill and which you fill past the neck, and has never once said so out loud. It took {{count}} of shoulder and rope, and the jars arrive cool.',
        tags: ['rope', 'jars'],
      },
      {
        name: 'Two climbs, the second one unasked',
        one_liner:
          'His shoulder-pole creaks through the frost and the pails come up full every time.',
        gate: 'uncommon',
        long_fire:
          ' He made the second climb that morning without being asked, which is the usual arrangement.',
        rare: ' He has filled that top house for longer than the top house has existed.',
        detail:
          '{{hour}} the pails go up two flights in the cold and come down full, and the third household is at the top of the hill and has never once asked for anything, and still gets its pail filled.',
        tags: ['pails', 'hill', 'frost'],
      },
      {
        name: 'Two climbs, the second one unasked',
        one_liner:
          'His shoulder-pole creaks through the frost and the pails come up full every time.',
        gate: 'uncommon',
        long_fire:
          ' He dumped it in the same place the next morning and laughed again when they shouted.',
        rare: ' He has never once changed where he puts the water down.',
        detail:
          'He dumps the spring water and the splash goes everywhere, and the household shouts at him, and he laughs, and next morning he dumps it in exactly the same place.',
        tags: ['spring', 'dumping', 'laughter'],
      },
      {
        name: 'Two climbs, the second one unasked',
        one_liner:
          'His shoulder-pole creaks through the frost and the pails come up full every time.',
        gate: 'rare',
        long_fire:
          ' He carried water to the empty house for a month after the people had gone, and nobody saw.',
        rare: ' He still walks past that house with a full pail, and it has been empty a long time.',
        detail:
          'A household in the quarter moved out and left the pail behind. He carries water to the empty house anyway for a month, and when the pail is finally thrown out he carries two.',
        tags: ['empty house', 'pail', 'month'],
      },
    ],
  },
  {
    name: 'An, the gate listener',
    one_liner: 'On the mounting stone, tipping their chin toward the latch before you arrive.',
    subject: 'the one who sits on the mounting stone',
    detail:
      'An has been on that stone long enough that the stone has taken the shape of them. They do not stand to be told anything, and they do not need to.',
    long_fire:
      ' The stone under An has a hollow worn into it, and the woolen scrap is dry and smells of nothing.',
    rare: ' An has counted more arrivals than the court has records, and says so without pride.',
    tags: ['gate', 'listener', 'stone'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'An tips their chin toward the latch before your boots finish on the flags, and the woolen cloth is already in their hand.',
        tags: ['gate', 'latch', 'wool'],
      },
      {
        detail:
          'The mounting stone is worn into a shape, and An sits in it the way water sits in a hollow.',
        tags: ['gate', 'stone', 'listener'],
      },
    ],
  },
  {
    name: 'Dan, the hedge pruner',
    one_liner: 'Wiping sap from the hook and pointing out briar in the paving.',
    subject: 'the one with sap on the apron',
    detail:
      'Dan has been cutting the same hedge long enough to know where it will next reach, and says so before it does. The billhook hangs back on its peg between cuttings, where the sap dries to a dark ring.',
    long_fire:
      ' The leather apron is stiff with a season of sap and the hook is wiped on it between every cut.',
    rare: ' Dan knows the briar by its root, and can name where it will be next year.',
    tags: ['hedge', 'sap', 'briar'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'The sap comes off the hook onto the stiff leather and Dan points at a flagstone with a green root lifted out of it.',
        tags: ['hedge', 'sap', 'briar'],
      },
      {
        detail:
          'A crack in the paving, a root in it, and a hook that has already been through there twice today.',
        tags: ['hedge', 'briar', 'stone'],
      },
    ],
  },
  {
    name: 'Sula, the roll attendant',
    one_liner: 'Unrolling mulberry and reading your habits back in a flat, calm voice.',
    subject: 'the one who reads without looking up',
    detail:
      'Sula reads what is written and nothing else. Whatever the paper says, the voice says it the same way it says the weather.',
    long_fire:
      ' The thumbs never hurry on the paper, and the voice does not change for what it finds.',
    rare: ' A whole roll of it, read in one voice, with nothing at all left out and nothing added.',
    tags: ['roll', 'paper', 'voice'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'The strip unrolls under steady thumbs and the voice reads your own habits back to you without a single shade of anything.',
        tags: ['roll', 'paper', 'voice'],
      },
      {
        detail:
          'Sula does not look up, and the reading goes on in exactly the same tone it started in.',
        tags: ['roll', 'voice', 'paper'],
      },
    ],
  },
  {
    name: 'Mire, the water tender',
    one_liner: 'Skimming the slow reach and watching the current at the sluice.',
    subject: 'the one with the wicker scoop',
    detail:
      "The reach is Mire's whole responsibility and the only thing that ever goes wrong with it is the current changing its mind. She refills the same two pails at the same hour, and the garden knows her step.",
    long_fire:
      ' The duckweed comes up green on the wicker and the water behind it is going the wrong way.',
    rare: ' The current has backed up to the sluice and Mire has been watching it for an hour.',
    tags: ['canal', 'scoop', 'duckweed'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'The wicker scoop comes up green and Mire says the current is backing, and the water behind the sluice agrees.',
        tags: ['canal', 'scoop', 'water'],
      },
      {
        detail:
          'Duckweed and twigs, lifted off the reach one at a time, all day, and the water is left clear.',
        tags: ['canal', 'scoop', 'duckweed'],
      },
    ],
  },
  {
    name: 'Kith, the vow walker',
    one_liner: 'Walking the fountain line, working the notched cord, matching your stride.',
    subject: 'the one counting laps on the cord',
    detail:
      'Kith does not talk while walking and does not slow down to be caught. The cord is the only thing in the whole court that is not patient.',
    long_fire:
      ' The cord is worked the whole way round the line, and the notches are counting laps you would not have counted.',
    rare: ' Three laps, in step, and the breathing has gone quiet enough to hear the bells over.',
    tags: ['vow', 'walk', 'cord'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'Kith walks the line with a thumb on the notched cord and matches you stride for stride without ever looking over.',
        tags: ['vow', 'walk', 'cord'],
      },
      {
        detail:
          "Three paces ahead there is only the next flagstone, and your breathing has taken the pace of someone else's.",
        tags: ['vow', 'walk', 'pace'],
      },
    ],
  },
  {
    name: 'Renn, the tea keeper',
    one_liner: 'Blowing on the embers and setting down a cup without asking who you are.',
    subject: 'the one over the charcoal',
    detail:
      'Renn has never once asked. The cup is set, and the question is whether you will drink it, and that is the only part that concerns anyone.',
    long_fire: ' The cracked cup is warm through and the kettle is only just off the embers.',
    rare: ' The cup is set down without a question and nobody comes back to ask about it.',
    tags: ['tea', 'hearth', 'cup'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'The cracked cup comes across the hearth stones and the steam goes up in front of your face and no question comes with it.',
        tags: ['tea', 'hearth', 'cup'],
      },
      {
        detail:
          'Renn blows once on the embers and the kettle answers, and the cup does not wait for a name.',
        tags: ['tea', 'hearth', 'kettle'],
      },
    ],
  },
  {
    name: 'Oris, the storm watcher',
    one_liner: 'At the last post, shading their eyes against the glare off the void.',
    subject: 'the one shading their eyes at the post',
    detail:
      'The post is the furthest laid ground, and the reason it is laid at all is that somebody has to stand on it and look outward all day. He counts the breaths between the flash and the sound, and writes the number down.',
    long_fire:
      ' The bleached post has the glare coming off it, and the squall behind the screens is not being held by much.',
    rare: ' Oris has watched the void long enough to read it the way you read a face.',
    tags: ['storm', 'post', 'watch'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'A forearm across the eyes against the glare, and a nod toward the screens where the wicker is starting to move.',
        tags: ['storm', 'post', 'void'],
      },
      {
        detail:
          'The watch-post is the last ground with a roof on it, and Oris is still looking past all of it.',
        tags: ['storm', 'post', 'watch'],
      },
    ],
  },
  {
    name: 'Vanya, the slate scourer',
    one_liner: 'Scrubbing slates in lime-water and setting out a clean dripping stone.',
    subject: 'the one with the horsehair brush',
    detail:
      'The brush is stiff enough to be unpleasant and the water is lime, and both are because a soft brush on wet slate leaves marks nobody wanted. The wet slate shows her own face for a moment before the damp takes it back.',
    long_fire:
      ' The lime-water is still cloudy from the last stone, and the set-out tablet is dripping on the bench.',
    rare: ' A stone scrubbed this hard gives back a grain so clean you can see the light through it.',
    tags: ['slate', 'lime', 'brush'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'The horsehair brush goes hard across the wet slate and the lime-water clouds, and a clean stone comes out dripping on the bench.',
        tags: ['slate', 'lime', 'brush'],
      },
      {
        detail:
          'Every tablet in the tub is losing something it was given, on purpose, and the water is doing the work.',
        tags: ['slate', 'lime', 'water'],
      },
    ],
  },
  {
    name: 'Cor, the bell striker',
    one_liner: 'Still at the cedar pillar, mallet held in, giving the nod before the one note.',
    subject: 'the one standing by the cedar pillar',
    detail:
      'The nod is the only warning you get, and it is a warning. Then the mallet goes up and the note goes on for three minutes and everyone in the court has to get through it.',
    long_fire:
      ' The cloth-wrapped mallet is up against the breastbone and the whole pavilion is waiting on the nod.',
    rare: ' Cor strikes it once a day and does not strike it twice, whatever the morning has been like.',
    tags: ['bell', 'mallet', 'noon'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'A nod, and then the mallet is up, and the single note goes out through the four posts and stays.',
        tags: ['bell', 'mallet', 'noon'],
      },
      {
        detail:
          'Cor stands perfectly still with the mallet held in, and the strike is the only fast thing that happens all day.',
        tags: ['bell', 'noon', 'post'],
      },
    ],
  },
  {
    name: 'Jael, the threshold attendant',
    one_liner: 'Kneeling on the damp flags, folding wet cloaks, filling the flue pegs.',
    subject: 'the one folding the wet cloaks',
    detail:
      'The pegs by the flue hold more than the pegs were cut for. Jael keeps them full and does not mention it, and the warmth gets into the cloth before it goes back.',
    long_fire:
      ' The bundle is tight and the pegs by the flue are full, and your wrap is steaming where the heat is getting into it.',
    rare: ' Jael has dried more wet cloaks than the court has beds, and the pegs were not built for it.',
    tags: ['threshold', 'cloak', 'pegs'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'The outer wrap goes up on a peg by the flue and the heat is already working on the cloth.',
        tags: ['threshold', 'cloak', 'pegs'],
      },
      {
        detail:
          'Jael is kneeling on the damp flags folding wet cloaks tight, and does not stop to ask whose they are.',
        tags: ['threshold', 'cloak', 'flags'],
      },
    ],
  },
  {
    name: 'Maren, the seed gatherer',
    one_liner: 'Shaking blackthorn into a split basket, hands scratched to a pattern.',
    subject: 'the one with the thorned fingers',
    detail:
      'The seeds go into the gaps and the hedge comes up through them, which means the hedge decides where it goes and Maren only persuades it. Each packet is dated in her hand, and the hand does not hurry.',
    long_fire:
      ' The black seeds are hard and dry, and the gaps along the northern hedge are waiting for them.',
    rare: ' Maren has planted enough blackthorn to close the whole storm line, one thorned hand at a time.',
    tags: ['seed', 'basket', 'hedge'],
    era: 'fantasy',
    templates: [
      {
        detail:
          "A scoop of hard black seeds pressed into the gap, and Maren's own hands are scratched in a pattern you can read.",
        tags: ['seed', 'hedge', 'basket'],
      },
      {
        detail:
          'The berries go into the split willow and the hedge along the north is not finished yet.',
        tags: ['seed', 'basket', 'hedge'],
      },
    ],
  },
  {
    name: 'Thess, the cane joiner',
    one_liner: 'Trimming white cane and fitting a polished jade pin in place of a cracked one.',
    subject: 'the one with the thumb-knife',
    detail:
      'Cane is cut to a slant and tested by flex, never by eye. The jade pin is not an ornament; it will outlast the rule it is fitted to.',
    long_fire:
      ' The green jade pin is polished and set dead true, and the cracked one is on the bench in two pieces.',
    rare: ' Thess has fitted jade to a rule that will outlast the both of them, and did not charge for the pin.',
    tags: ['cane', 'jade', 'hinge'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'The cracked hinge comes out and a polished green pin goes in, and the rule closes like it never had a crack.',
        tags: ['cane', 'jade', 'hinge'],
      },
      {
        detail:
          'White river cane trimmed on the slant, flexed by thumb, and set with a peg that will still be smooth in twenty years.',
        tags: ['cane', 'jade', 'knife'],
      },
    ],
  },
];

const PLACES: readonly CatalogEntry[] = [
  {
    name: 'The night market',
    one_liner:
      'Oiled paper lanterns illuminate rows of noodle cauldrons and scrap-iron stalls along the west canal.',
    subject: 'canal-side stalls after curfew',
    detail:
      'Under grease-blackened awnings, blacksmiths sell recycled ship nails while herb women weigh dried aconite against river pebbles. The night patrol looks the other way so long as the braziers stay covered and the ash buckets are kept full of canal water.',
    long_fire: ' You went the long way round twice, and stayed longer than the errand needed.',
    rare: ' Every stall-holder here knows which cup is yours, and one of them has started setting it out early.',
    tags: ['market', 'night'],
    templates: [
      {
        detail:
          'Oiled paper lanterns over noodle cauldrons and scrap-iron stalls, and the whole west canal eating standing up. {{hour}} the last cauldron is scraped for whoever has been working since before the first pot was lit.',
        tags: ['lantern', 'cauldron'],
      },
      {
        detail:
          'Noodle cauldrons and scrap-iron stalls, and the whole west canal eating standing up. {{tie}} eats early, at the far end, alone, and has done for years.',
        tags: ['tie'],
      },
    ],
  },
  {
    name: 'The river stair',
    one_liner:
      'Forty granite slabs cut with high-water marks and worn smooth by the bare feet of three dynasties.',
    subject: 'granite slabs down to the ferry slip',
    detail:
      'Washerwomen beat hemp cloth against the middle risers at daybreak while boatmen loop wet hawsers around the iron bull-rings. The lowest three steps stay green with slick river weed, submerged whenever the mountain snow melts in spring.',
    long_fire: ' You sat on the middle riser longer than the washing took.',
    rare: ' There is no second stair like it on this bank, and everyone on the water knows which one you mean.',
    tags: ['river', 'stair'],
    templates: [
      {
        gate: 'uncommon',
        detail:
          'Forty-one steps cut into the bank, slippery enough to be a real hazard and worn enough to be a public fact. You go down it {{hour}} carrying a load you have been carrying for {{count}}, and you have never once dropped anything.',
      },
      {
        detail:
          'Forty-one steps, worn to a public fact. {{tie}} counts them out loud when the water is high, and has never once counted wrong.',
        tags: ['tie'],
      },
    ],
  },
  {
    name: 'The dry cistern',
    era: 'tang',
    one_liner:
      'A vaulted brick chamber beneath the garrison storehouse, dry for years but still cool in the summer heat.',
    subject: 'a dry reservoir under the garrison',
    detail:
      'Faint mineral waterlines still ring the curved brick walls where rain cisterns once filled. Down here the street clamor and market alarms fade into damp silence, leaving a quiet refuge when the garrison gates swing shut.',
    long_fire: ' You went down and looked again, in case the waterlines had moved.',
    rare: ' The water has not been in it in living memory, and the lines are the most careful record anyone kept of it.',
    tags: ['cistern', 'dry'],
    templates: [
      {
        detail:
          'Dry for years and still cool in the summer, the curved brick holds its mineral waterlines like a tide that never came in. Down here the street clamor and the market alarms both lose.',
        tags: ['brick', 'cool'],
      },
    ],
  },
  {
    name: 'The clock attic',
    one_liner:
      'A timber loft smelling of pine pitch where copper clepsydras and bronze gears measure the watches of the night.',
    subject: 'a water-clock loft in the watch tower',
    detail:
      "Bronze floats rise in tiered reservoirs of siphoned well water, tripping counterweights that strike small gongs on the quarter-hour. The astronomer's apprentice sleeps on an oat-straw pallet between the copper drums, waking only to refill the upper basin.",
    long_fire: ' You stayed up for all four, and counted them yourself.',
    rare: ' There is one of these, and it has been keeping this city slightly wrong for longer than the city has been here.',
    tags: ['attic', 'clocks'],
    templates: [
      {
        detail:
          'Bronze floats rise in tiered reservoirs of siphoned well water and trip counterweights that strike small gongs on the quarter-hour. {{hour}} the apprentice refills the upper basin without being asked.',
        tags: ['bronze', 'quarter'],
      },
      {
        detail:
          'Bronze floats ride the siphoned well water and trip counterweights that strike small gongs on the quarter-hour. {{tie}} sleeps through all four of them.',
        tags: ['tie'],
      },
    ],
  },
  {
    name: 'The unlisted quay',
    one_liner:
      'A hidden stone wharf tucked behind weeping willows where uninspected barges discharge their cargo before dawn.',
    subject: 'a stone wharf behind the willows',
    detail:
      'Rough cedar piles jut from the tidal mud, bound with greased cables that leave no gouges on approaching hulls. Small river smacks tie up with muffled oars, transferring salt sacks and unregistered iron to cart-drivers who pay in unminted silver.',
    long_fire: ' You walked it twice, and nobody followed you, which is the point of it.',
    rare: ' Somebody is paying to keep the cables greased, and nobody will say who, and everybody uses it.',
    tags: ['quay', 'unlisted'],
    templates: [
      {
        detail:
          'Cedar piles jut from the tidal mud, bound with greased cables that leave no gouge on an approaching hull. Small river smacks tie up with muffled oars and pay in unminted silver.',
        tags: ['cedar', 'mud'],
      },
      {
        detail:
          'There is no sign and no marker, and the stone is worn anyway. {{tie}} brought you down here once and has not mentioned it since.',
        tags: ['tie'],
      },
    ],
  },
  {
    name: 'The extra seat',
    one_liner:
      'A cedar bench with a clean bowl and chopsticks, kept vacant at every evening meal for an unexpected traveler.',
    subject: 'a place set for an unexpected guest',
    detail:
      'It sits at the corner nearest the courtyard door, swept clear and laid with fresh willow chopsticks before the soup pot is ladled. The children know never to heap winter cloaks there, keeping the threshold clear for whoever steps in out of the dark.',
    long_fire: ' You laid it again after the sweep, and again after that.',
    rare: ' It has been there every evening since, and no one has ever once asked who it is for.',
    tags: ['seat', 'offered'],
    templates: [
      {
        detail:
          'It sits nearest the courtyard door, swept clear and laid with fresh willow chopsticks before the soup is ladled. The children know never to heap winter cloaks there.',
        tags: ['seat', 'threshold'],
      },
      {
        gate: 'rare',
        flourish: 'It has been needed often enough to stop feeling like an offering.',
        detail:
          'You put it on the bench {{hour}}, and the bowl goes down at that corner first, and the household has stopped remarking on it, which is the highest thing you can say about a habit.',
      },
      {
        detail:
          'The bench is longer than the household needs and you keep it that way. {{tie}} sits at the far end of it and nobody measures the gap.',
        tags: ['tie'],
      },
    ],
  },
  {
    name: 'The Twin Fountains terrace',
    one_liner: 'Two low basins and the straight worn line of flags walked between them.',
    subject: 'flagstones between two low basins',
    detail:
      'Two basins, one line, and as many laps as it takes. Nobody counts for you and nobody will tell you when to stop.',
    long_fire:
      ' The flags between the basins are worn pale in a straight line, and your feet know the length of it by now.',
    rare: ' The water in the southern basin is high enough to break over the lip in a wind.',
    tags: ['fountains', 'flags', 'pacing'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'You walk the straight line between the two basins and the paving under you is worn to a pale stripe.',
        tags: ['fountains', 'flags', 'pacing'],
      },
      {
        detail:
          'Neither basin is doing anything. You walk between them anyway, because the walking is the part that helps.',
        tags: ['fountains', 'pacing', 'water'],
      },
    ],
  },
  {
    name: 'The Low Gate threshold',
    one_liner: 'A grey lintel and a cane wicket where arriving travelers are looked at.',
    subject: 'a grey lintel and a cane wicket',
    detail:
      'Nobody is let past the threshold without being looked at. Not for papers, not for a name, just so that whoever is on the other side is a person and not a rumour.',
    long_fire:
      ' The grey lintel is cold and the cane wicket is not, and the difference is the whole point of the gate.',
    rare: ' The wicket is newer than the stone around it, and the stone is much older than anything else here.',
    tags: ['gate', 'threshold', 'wicket'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'The cane wicket gives under your hand and you stop, and the eyes on the other side of the stone are waiting.',
        tags: ['gate', 'threshold', 'wicket'],
      },
      {
        detail:
          'You stand on the flags in your travel clothes and nobody asks you for anything at all.',
        tags: ['gate', 'threshold', 'watches'],
      },
    ],
  },
  {
    name: 'The Hall of Rolls',
    one_liner: 'An open pavilion where everything anyone came here about is read aloud.',
    subject: 'a pavilion of pale posts and slate',
    detail:
      'Everything anyone has ever come here to be reminded of is unrolled on these tables, in order, and read out in a voice with no opinion in it. Visitors speak at the door, and the shelves answer in paper.',
    long_fire:
      ' The mulberry goes brittle where the thumbs have worked the edge, and the whole length of it is soft where it is handled.',
    rare: ' A roll long enough to need two trestles has been read to the end without anyone being named in it.',
    tags: ['rolls', 'cedar', 'paper'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'The unrolling goes on and on down the trestle, and the voice reading it has no rise or fall in it at all.',
        tags: ['rolls', 'paper', 'reading'],
      },
      {
        detail:
          'Mulberry under a slate roof, and the paper has gone the colour of weak tea along every handled edge.',
        tags: ['rolls', 'cedar', 'paper'],
      },
    ],
  },
  {
    name: 'The Storm Edge ditch',
    one_liner:
      'A wide gravel ditch where the laid flagstones end and the unfinished ground begins.',
    subject: 'a wide ditch of gravel and briar',
    detail:
      'The last ground that is laid. Everything past the gravel lip is not hostile, it is simply not finished, and the briar is what holds the two apart.',
    long_fire:
      ' The gravel has shifted in the night and taken a new bite out of the edge of the flags.',
    rare: ' The briar has grown across the ditch mouth in places, and nobody cuts it back.',
    tags: ['ditch', 'briar', 'boundary'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'The gravel gives under your boots and then the flags stop, and the wind coming off it has nothing in it to hold.',
        tags: ['ditch', 'briar', 'boundary'],
      },
      {
        detail:
          'You can stand on the last laid stone and look at the place where the ground stops being ground.',
        tags: ['ditch', 'boundary', 'stones'],
      },
    ],
  },
  {
    name: 'The Bell Pavilion',
    one_liner: 'A low-hung bronze bell in four cedar posts, close enough to feel it arrive.',
    subject: 'four posts and a low-hung bell',
    detail:
      'It hangs low on purpose. You are meant to be close enough to feel it arrive before you hear it, and close enough that the hum does not have far to go.',
    long_fire:
      ' The rawhide takes up the note instead of throwing it back, and the three minutes stay inside the pavilion.',
    rare: ' The rim is worn smooth at the one place where a forehead rests.',
    tags: ['bell', 'cedar', 'hide'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'The bell is hung so low that a seated head is level with the rim, and the hum does not go anywhere.',
        tags: ['bell', 'hide', 'listening'],
      },
      {
        detail:
          'The mallet comes up off the rawhide and the sound stays in the four posts with you.',
        tags: ['bell', 'cedar', 'note'],
      },
    ],
  },
  {
    name: 'The Slow Water reach',
    one_liner: 'A straight canal so slow a fallen leaf takes half a morning to cross it.',
    subject: 'a straight canal of flat blue stone',
    detail:
      'Nothing about it is fast. A thing put in at the sluice is still arriving at the weir at noon, and you can watch the whole journey if you have half a morning and nothing else to do.',
    long_fire:
      ' The leaves are halfway down the reach, which means they were released before you thought to look.',
    rare: ' A willow leaf has made the full length of the canal and arrived without being hurried once.',
    tags: ['canal', 'weir', 'leaves'],
    era: 'fantasy',
    templates: [
      {
        detail:
          'A leaf goes past the sluice and you watch it most of the way to the weir before your attention gives out.',
        tags: ['canal', 'leaves', 'weir'],
      },
      {
        detail:
          'The water is not moving as far as you can see, and the leaf on it is not moving either, and both are wrong.',
        tags: ['canal', 'water', 'weir'],
      },
    ],
  },
];

export const CATALOG: CatalogMap = {
  thing: THINGS,
  outcome: OUTCOMES,
  change: CHANGES,
  person: [...PEOPLE, ...FIGURE_PEOPLE],
  place: [...PLACES, ...FIGURE_PLACES],
};

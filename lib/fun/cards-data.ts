// Cartes des jeux « Questions de couple » et « Défis de soirée ».
// Contenu fourni par le couple (questions_et_defis.txt), converti tel quel.

export type Card = { n: number; text: string; title?: string; group?: string };

export type Deck = {
  id: string;
  emoji: string;
  title: string;
  /** Contenu réservé aux adultes : masqué tant que l'option 18+ n'est pas activée. */
  adult: boolean;
  cards: Card[];
};

export type ChallengePile = "party" | "couple" | "afterdark" | "special";

export const QUESTION_LEVELS: Deck[] = [
  {
    id: "q1",
    emoji: "🟢",
    title: "Niveau 1 — Bizarre, drôle & imprévisible",
    adult: false,
    cards: [
      {
        n: 1,
        text: "Si notre couple avait un parfum, il sentirait quoi ?",
      },
      {
        n: 2,
        text: "Quelle loi complètement absurde devrait exister uniquement chez nous ?",
      },
      {
        n: 3,
        text: "Si on devait fuir le pays demain, où partirais-tu sans réfléchir ?",
      },
      {
        n: 4,
        text: "Quel serait le titre de notre documentaire Netflix ?",
      },
      {
        n: 5,
        text: "Si tu pouvais me donner une compétence instantanément, laquelle ?",
      },
      {
        n: 6,
        text: "Quel objet banal résume étonnamment bien ma personnalité ?",
      },
      {
        n: 7,
        text: "Si nous étions deux escrocs dans un film, lequel de nous improviserait tout ?",
      },
      {
        n: 8,
        text: "Quelle chose totalement inutile voudrais-tu qu'on apprenne ensemble ?",
      },
      {
        n: 9,
        text: "Si notre relation avait une mascotte, laquelle serait-elle ?",
      },
      {
        n: 10,
        text: "Quel mensonge ridicule pourrais-tu faire croire sur notre rencontre ?",
      },
      {
        n: 11,
        text: "Si je devenais célèbre demain, pour quelle raison improbable ?",
      },
      {
        n: 12,
        text: "Quelle mauvaise idée à deux te paraît étrangement tentante ?",
      },
      {
        n: 13,
        text: "Si on ouvrait un commerce absurde ensemble, qu'est-ce qu'on vendrait ?",
      },
      {
        n: 14,
        text: "Quel serait notre nom de groupe de musique ?",
      },
      {
        n: 15,
        text: "Quelle chose tu penses que je serais absolument incapable de faire ?",
      },
      {
        n: 16,
        text: "Dans quel jeu télévisé me ferais-tu participer contre mon gré ?",
      },
      {
        n: 17,
        text: "Quel personnage fictif serait mon pire colocataire ?",
      },
      {
        n: 18,
        text: "Si on échangeait nos personnalités pendant 24 heures, qui souffrirait le plus ?",
      },
      {
        n: 19,
        text: "Quel serait notre talent collectif le plus inutile ?",
      },
      {
        n: 20,
        text: "Quelle est la situation la plus absurde dans laquelle tu nous imagines ?",
      },
      {
        n: 21,
        text: "Si notre couple était une application, à quoi servirait-elle ?",
      },
      {
        n: 22,
        text: "Quel serait notre mot de passe ridicule ?",
      },
      {
        n: 23,
        text: "Quelle célébrité pourrait jouer ton rôle dans un film sur notre histoire ?",
      },
      {
        n: 24,
        text: "Quel serait le titre du chapitre le plus chaotique de notre histoire ?",
      },
      {
        n: 25,
        text: "Si nous étions coincés dans un ascenseur pendant trois heures, au bout de combien de temps commencerais-tu à paniquer ?",
      },
      {
        n: 26,
        text: "Quel objet tu volerais dans un hôtel sans jamais l'assumer ?",
      },
      {
        n: 27,
        text: "Quelle compétition improbable pourrais-tu gagner ?",
      },
      {
        n: 28,
        text: "Quel est ton talent que tu pourrais vendre très cher alors qu'il ne sert à rien ?",
      },
      {
        n: 29,
        text: "Quel serait ton pire métier si tu devais me remplacer ?",
      },
      {
        n: 30,
        text: "Quel métier serait parfait pour moi dans une autre vie ?",
      },
      {
        n: 31,
        text: "Si nous étions des fantômes, où irions-nous hanter les gens ?",
      },
      {
        n: 32,
        text: "Quel serait le pire voyage qu'on puisse décider de faire ensemble ?",
      },
      {
        n: 33,
        text: "Quelle activité totalement enfantine voudrais-tu recommencer avec moi ?",
      },
      {
        n: 34,
        text: "Quelle règle absurde imposerais-tu à notre maison ?",
      },
      {
        n: 35,
        text: "Quel objet chez moi te représente secrètement ?",
      },
      {
        n: 36,
        text: "Quel emoji représente le mieux notre dynamique ?",
      },
      {
        n: 37,
        text: "Quelle chanson serait honteuse mais parfaite comme générique de notre couple ?",
      },
      {
        n: 38,
        text: "Quelle rumeur absurde sur nous pourrait facilement devenir crédible ?",
      },
      {
        n: 39,
        text: "Quel complot imaginaire pourrait expliquer notre rencontre ?",
      },
      {
        n: 40,
        text: "Quelle photo de nous serait la plus compromettante hors contexte ?",
      },
      {
        n: 41,
        text: "Si on devait porter le même vêtement pendant une semaine, lequel ?",
      },
      {
        n: 42,
        text: "Qui serait le plus mauvais espion ?",
      },
      {
        n: 43,
        text: "Qui se ferait arrêter en premier dans un film de braquage ?",
      },
      {
        n: 44,
        text: "Qui de nous aurait le plus de chances de survivre à une apocalypse ridicule ?",
      },
      {
        n: 45,
        text: "Quelle aventure totalement imprévue voudrais-tu tenter avec moi ?",
      },
      {
        n: 46,
        text: "Si on échangeait nos téléphones pendant une journée, qui paniquerait le premier ?",
      },
      {
        n: 47,
        text: "Quelle habitude chez moi ferait fuir un extraterrestre ?",
      },
      {
        n: 48,
        text: "Quelle chose complètement ridicule pourrait nous rendre célèbres ?",
      },
      {
        n: 49,
        text: "Quel serait notre surnom si nous étions un duo de catcheurs ?",
      },
      {
        n: 50,
        text: "Quel secret absurde pourrais-tu cacher pendant dix ans ?",
      },
      {
        n: 51,
        text: "Quel défi idiot accepterais-tu sans demander les règles ?",
      },
      {
        n: 52,
        text: "Quelle question que personne ne pose jamais aimerais-tu poser à ton partenaire ?",
      },
    ],
  },
  {
    id: "q2",
    emoji: "🟡",
    title: "Niveau 2 — Goûts étranges, petits secrets & choix forcés",
    adult: false,
    cards: [
      {
        n: 53,
        text: "Quelle opinion très peu populaire défends-tu vraiment ?",
      },
      {
        n: 54,
        text: "Quel truc que tout le monde adore ne te fait aucun effet ?",
      },
      {
        n: 55,
        text: "Quelle habitude bizarre n'assumes-tu qu'à moitié ?",
      },
      {
        n: 56,
        text: "Quel plaisir un peu honteux pourrais-tu m'avouer ?",
      },
      {
        n: 57,
        text: "Quel est ton plus gros « je sais que c'est idiot, mais… » ?",
      },
      {
        n: 58,
        text: "Quelle chose pourrais-tu faire pendant des heures sans voir le temps passer ?",
      },
      {
        n: 59,
        text: "Quelle petite jalousie ridicule pourrais-tu avoir ?",
      },
      {
        n: 60,
        text: "Quelle chose chez quelqu'un peut t'énerver immédiatement sans raison logique ?",
      },
      {
        n: 61,
        text: "Quel type de personne t'intrigue alors qu'elle ne te ressemble pas du tout ?",
      },
      {
        n: 62,
        text: "Quelle qualité est beaucoup plus sexy qu'on ne le dit ?",
      },
      {
        n: 63,
        text: "Quel défaut peut devenir attirant dans le bon contexte ?",
      },
      {
        n: 64,
        text: "Quel comportement te donne immédiatement envie de connaître quelqu'un ?",
      },
      {
        n: 65,
        text: "Quelle chose te fait secrètement juger quelqu'un ?",
      },
      {
        n: 66,
        text: "Quelle chose te fait changer d'avis sur une personne en cinq minutes ?",
      },
      {
        n: 67,
        text: "Quelle petite attention pourrait te faire fondre davantage qu'un gros cadeau ?",
      },
      {
        n: 68,
        text: "Quel compliment tu voudrais recevoir mais que les gens oublient souvent ?",
      },
      {
        n: 69,
        text: "Quel compliment as-tu toujours du mal à croire ?",
      },
      {
        n: 70,
        text: "Quelle facette de toi les gens découvrent généralement trop tard ?",
      },
      {
        n: 71,
        text: "Quelle facette de moi t'a surpris après quelques mois ?",
      },
      {
        n: 72,
        text: "Quel est ton plus gros contraste de personnalité ?",
      },
      {
        n: 73,
        text: "Quelle chose pourrais-tu faire uniquement parce que personne ne te regarde ?",
      },
      {
        n: 74,
        text: "Quel comportement est un « green flag » immédiat pour toi ?",
      },
      {
        n: 75,
        text: "Quel comportement est un « red flag » immédiat ?",
      },
      {
        n: 76,
        text: "Quelle règle sociale pourrais-tu facilement ignorer ?",
      },
      {
        n: 77,
        text: "Quelle chose sembles-tu très sûr(e) de toi alors que ce n'est pas vraiment le cas ?",
      },
      {
        n: 78,
        text: "Quel sujet te rend beaucoup plus passionné(e) que prévu ?",
      },
      {
        n: 79,
        text: "Quelle chose t'ennuie alors que presque tout le monde adore ça ?",
      },
      {
        n: 80,
        text: "Quel petit détail peut changer totalement ton humeur ?",
      },
      {
        n: 81,
        text: "Quel est ton meilleur mécanisme pour éviter une conversation gênante ?",
      },
      {
        n: 82,
        text: "Quelle est ta pire excuse quand tu n'as pas envie de sortir ?",
      },
      {
        n: 83,
        text: "Quelle chose tu prétends comprendre alors qu'en réalité non ?",
      },
      {
        n: 84,
        text: "Quelle situation sociale te donne le plus envie de disparaître ?",
      },
      {
        n: 85,
        text: "Quel est ton « tic » le plus étrange ?",
      },
      {
        n: 86,
        text: "Quelle est ta manière la plus bizarre de te détendre ?",
      },
      {
        n: 87,
        text: "Qu'est-ce qui peut te faire instantanément perdre ton sérieux ?",
      },
      {
        n: 88,
        text: "Quel comportement chez moi trouves-tu plus mignon que tu ne devrais ?",
      },
      {
        n: 89,
        text: "Quelle petite bizarrerie chez moi as-tu fini par aimer ?",
      },
      {
        n: 90,
        text: "Quelle différence entre nous t'amuse le plus ?",
      },
      {
        n: 91,
        text: "Quel désaccord entre nous serait impossible à régler ?",
      },
      {
        n: 92,
        text: "Quelle décision complètement irrationnelle pourrais-tu prendre sur un coup de tête ?",
      },
      {
        n: 93,
        text: "Qu'est-ce que tu ferais si tu n'avais aucun risque d'échouer ?",
      },
      {
        n: 94,
        text: "Quelle version de ta vie parallèle t'intrigue le plus ?",
      },
      {
        n: 95,
        text: "Quelle chose voudrais-tu tester pendant une semaine juste pour voir ?",
      },
      {
        n: 96,
        text: "Quel secret non grave n'as-tu jamais pensé à me raconter ?",
      },
      {
        n: 97,
        text: "Quelle partie de toi est beaucoup plus sensible qu'elle n'en a l'air ?",
      },
      {
        n: 98,
        text: "Quelle chose t'intimide plus que tu ne le montres ?",
      },
      {
        n: 99,
        text: "Quelle chose chez moi t'intimide légèrement ?",
      },
      {
        n: 100,
        text: "Quelle habitude de couple te semblerait très bizarre mais amusante ?",
      },
      {
        n: 101,
        text: "Quel serait ton sujet de conversation parfait à 3 h du matin ?",
      },
      {
        n: 102,
        text: "Quel est le truc le plus inattendu qui pourrait te rendre jaloux/jalouse ?",
      },
      {
        n: 103,
        text: "Quel choix entre nous deux te ferait hésiter pendant dix minutes ?",
      },
      {
        n: 104,
        text: "Quelle question te ferait rire avant même d'avoir répondu ?",
      },
    ],
  },
  {
    id: "q3",
    emoji: "🟠",
    title: "Niveau 3 — Premières impressions, crushes & petites confessions",
    adult: false,
    cards: [
      {
        n: 105,
        text: "Quelle a été ta première pensée en me voyant ?",
      },
      {
        n: 106,
        text: "Quelle chose chez moi as-tu remarquée avant tout le reste ?",
      },
      {
        n: 107,
        text: "As-tu déjà essayé de paraître moins intéressé(e) que tu ne l'étais ?",
      },
      {
        n: 108,
        text: "Quand as-tu compris que je pouvais vraiment te plaire ?",
      },
      {
        n: 109,
        text: "Quel moment de nos débuts t'a le plus marqué ?",
      },
      {
        n: 110,
        text: "Quelle impression avais-tu de ma personnalité ?",
      },
      {
        n: 111,
        text: "Quelle impression avais-tu de moi physiquement ?",
      },
      {
        n: 112,
        text: "Quelle chose pensais-tu faussement de moi au début ?",
      },
      {
        n: 113,
        text: "Quelle chose avais-tu devinée immédiatement ?",
      },
      {
        n: 114,
        text: "As-tu déjà raconté notre rencontre de manière plus romantique qu'elle ne l'était ?",
      },
      {
        n: 115,
        text: "Quel message de moi t'a particulièrement marqué ?",
      },
      {
        n: 116,
        text: "As-tu déjà écrit un message puis décidé de ne pas l'envoyer ?",
      },
      {
        n: 117,
        text: "Quelle était ta meilleure technique pour faire semblant d'être détaché(e) ?",
      },
      {
        n: 118,
        text: "As-tu déjà attendu volontairement avant de me répondre ?",
      },
      {
        n: 119,
        text: "Quel était ton plus gros signe de flirt à l'époque ?",
      },
      {
        n: 120,
        text: "Quel était ton premier vrai doute à mon sujet ?",
      },
      {
        n: 121,
        text: "Quelle chose t'a donné envie de mieux me connaître ?",
      },
      {
        n: 122,
        text: "Quel détail banal m'a rendu(e) plus attirant(e) à tes yeux ?",
      },
      {
        n: 123,
        text: "Quel moment m'a rendu(e) soudainement très séduisant(e) ?",
      },
      {
        n: 124,
        text: "Quelle était ta première jalousie me concernant ?",
      },
      {
        n: 125,
        text: "As-tu déjà regardé discrètement qui me suivait sur les réseaux ?",
      },
      {
        n: 126,
        text: "As-tu déjà interprété un message de moi pendant beaucoup trop longtemps ?",
      },
      {
        n: 127,
        text: "Quelle phrase de moi t'est restée en tête ?",
      },
      {
        n: 128,
        text: "Quel était ton premier mensonge innocent pour impressionner quelqu'un ?",
      },
      {
        n: 129,
        text: "As-tu déjà prétendu connaître un sujet pour impressionner quelqu'un ?",
      },
      {
        n: 130,
        text: "Quel était ton crush le plus improbable ?",
      },
      {
        n: 131,
        text: "Quel personnage fictif t'a déjà réellement attiré(e) ?",
      },
      {
        n: 132,
        text: "Quel type de personne te plaisait avant et plus du tout aujourd'hui ?",
      },
      {
        n: 133,
        text: "Quel type de personne t'attire aujourd'hui alors qu'avant non ?",
      },
      {
        n: 134,
        text: "Quel rendez-vous de ton passé a été un désastre absolu ?",
      },
      {
        n: 135,
        text: "Quel rendez-vous de ton passé te fait encore rire ?",
      },
      {
        n: 136,
        text: "Quelle a été ta pire tentative de flirt ?",
      },
      {
        n: 137,
        text: "Quelle a été ta meilleure ?",
      },
      {
        n: 138,
        text: "As-tu déjà embrassé quelqu'un alors que tu savais que c'était une mauvaise idée ?",
      },
      {
        n: 139,
        text: "Quelle est la chose la plus gênante que tu aies faite pour quelqu'un qui te plaisait ?",
      },
      {
        n: 140,
        text: "Quelle est la chose la plus courageuse que tu aies faite par attirance ?",
      },
      {
        n: 141,
        text: "As-tu déjà fait semblant de ne pas reconnaître quelqu'un ?",
      },
      {
        n: 142,
        text: "As-tu déjà espéré croiser quelqu'un « par hasard » ?",
      },
      {
        n: 143,
        text: "Quel est ton plus gros souvenir de papillons dans le ventre ?",
      },
      {
        n: 144,
        text: "Quel compliment reçu dans ta vie t'est resté ?",
      },
      {
        n: 145,
        text: "Quel compliment venant de moi t'a le plus marqué ?",
      },
      {
        n: 146,
        text: "Quelle photo de moi t'a déjà fait un effet inattendu ?",
      },
      {
        n: 147,
        text: "Quel look de moi t'a le plus surpris ?",
      },
      {
        n: 148,
        text: "Quel look de moi t'a fait te dire « wow » ?",
      },
      {
        n: 149,
        text: "Quel moment précis m'a rendu(e) plus désirable à tes yeux ?",
      },
      {
        n: 150,
        text: "Quel détail chez moi pensais-tu ne jamais remarquer et que tu regardes maintenant ?",
      },
      {
        n: 151,
        text: "Quel souvenir de nos débuts voudrais-tu revivre ?",
      },
      {
        n: 152,
        text: "Quel moment de notre histoire raconterais-tu en premier ?",
      },
      {
        n: 153,
        text: "Quel souvenir de nous te fait encore sourire tout seul ?",
      },
      {
        n: 154,
        text: "Quelle ancienne version de nous deux te manque ?",
      },
      {
        n: 155,
        text: "Quelle chose n'as-tu jamais osé me dire au début ?",
      },
      {
        n: 156,
        text: "Quelle confession de nos débuts me surprendrait encore ?",
      },
    ],
  },
  {
    id: "q4",
    emoji: "🔵",
    title: "Niveau 4 — Psychologie, vulnérabilité & vraies questions",
    adult: false,
    cards: [
      {
        n: 157,
        text: "Quelle partie de toi as-tu le plus peur de montrer complètement ?",
      },
      {
        n: 158,
        text: "Quelle blessure ancienne influence encore ta façon d'aimer ?",
      },
      {
        n: 159,
        text: "Quel comportement te fait te fermer immédiatement ?",
      },
      {
        n: 160,
        text: "Qu'est-ce qui te permet de t'ouvrir ?",
      },
      {
        n: 161,
        text: "Quelle vérité sur toi est difficile à expliquer ?",
      },
      {
        n: 162,
        text: "Quelle peur relationnelle n'avoues-tu pas facilement ?",
      },
      {
        n: 163,
        text: "Quelle chose pourrais-je faire pour te rassurer davantage ?",
      },
      {
        n: 164,
        text: "Qu'est-ce qui te fait te sentir réellement compris(e) ?",
      },
      {
        n: 165,
        text: "À quel moment te sens-tu le plus vulnérable avec moi ?",
      },
      {
        n: 166,
        text: "Quelle conversation entre nous est probablement overdue ?",
      },
      {
        n: 167,
        text: "Quelle question voudrais-tu que je te pose plus souvent ?",
      },
      {
        n: 168,
        text: "Quelle question as-tu peur que je te pose ?",
      },
      {
        n: 169,
        text: "Quelle chose voudrais-tu pouvoir me dire sans aucune conséquence ?",
      },
      {
        n: 170,
        text: "Quel besoin as-tu le plus de mal à exprimer ?",
      },
      {
        n: 171,
        text: "Quelle émotion caches-tu le mieux ?",
      },
      {
        n: 172,
        text: "Quelle émotion contrôles-tu le moins ?",
      },
      {
        n: 173,
        text: "Quelle chose te fait te sentir immédiatement en sécurité ?",
      },
      {
        n: 174,
        text: "Quelle chose te fait te sentir contrôlé(e) ?",
      },
      {
        n: 175,
        text: "Quelle place doit avoir la liberté dans un couple ?",
      },
      {
        n: 176,
        text: "Quelle place doit avoir la fusion ?",
      },
      {
        n: 177,
        text: "Quelle chose peut te faire perdre confiance très rapidement ?",
      },
      {
        n: 178,
        text: "Qu'est-ce qui te ferait reconstruire cette confiance ?",
      },
      {
        n: 179,
        text: "Pour toi, jusqu'où va la transparence dans un couple ?",
      },
      {
        n: 180,
        text: "Y a-t-il des choses qu'on a le droit de garder pour soi ?",
      },
      {
        n: 181,
        text: "Où commence pour toi l'infidélité émotionnelle ?",
      },
      {
        n: 182,
        text: "Peut-on aimer quelqu'un et être attiré(e) par une autre personne ?",
      },
      {
        n: 183,
        text: "Quelle situation te rendrait réellement jaloux/jalouse ?",
      },
      {
        n: 184,
        text: "Quelle situation ne te dérangerait pas du tout ?",
      },
      {
        n: 185,
        text: "Quel rôle la jalousie peut-elle avoir dans une relation saine ?",
      },
      {
        n: 186,
        text: "Quelle différence entre nous pourrait nous faire grandir ?",
      },
      {
        n: 187,
        text: "Quelle différence entre nous pourrait nous éloigner ?",
      },
      {
        n: 188,
        text: "Quelle partie de notre couple te semble sous-estimée ?",
      },
      {
        n: 189,
        text: "Quelle partie de notre couple mérite beaucoup plus d'attention ?",
      },
      {
        n: 190,
        text: "Qu'est-ce que tu voudrais qu'on protège à tout prix ?",
      },
      {
        n: 191,
        text: "Qu'est-ce que tu voudrais qu'on change ?",
      },
      {
        n: 192,
        text: "Quel comportement de couple voudrais-tu qu'on abandonne ?",
      },
      {
        n: 193,
        text: "Quel nouveau rituel voudrais-tu créer ?",
      },
      {
        n: 194,
        text: "Quelle aventure voudrais-tu absolument vivre avec moi ?",
      },
      {
        n: 195,
        text: "Quel risque aimerais-tu qu'on prenne ensemble ?",
      },
      {
        n: 196,
        text: "Quelle peur aimerais-tu que je connaisse vraiment ?",
      },
      {
        n: 197,
        text: "Quelle peur penses-tu que je cache ?",
      },
      {
        n: 198,
        text: "Quelle qualité chez moi t'aide à te sentir mieux ?",
      },
      {
        n: 199,
        text: "Quelle qualité chez moi te met parfois au défi ?",
      },
      {
        n: 200,
        text: "Qu'est-ce que cette relation t'a appris sur toi ?",
      },
      {
        n: 201,
        text: "Qu'est-ce qu'elle t'a appris sur l'amour ?",
      },
      {
        n: 202,
        text: "Quelle partie de toi est devenue plus forte depuis notre rencontre ?",
      },
      {
        n: 203,
        text: "Quelle partie de toi est devenue plus sensible ?",
      },
      {
        n: 204,
        text: "Quel moment t'a fait penser qu'on formait réellement une équipe ?",
      },
      {
        n: 205,
        text: "Quelle difficulté nous a finalement rapprochés ?",
      },
      {
        n: 206,
        text: "Quelle chose n'as-tu jamais vraiment pardonnée à quelqu'un dans ton passé ?",
      },
      {
        n: 207,
        text: "Qu'est-ce que tu ne voudrais jamais reproduire dans notre relation ?",
      },
      {
        n: 208,
        text: "Quelle vérité sur l'amour penses-tu que les gens comprennent mal ?",
      },
    ],
  },
  {
    id: "q5",
    emoji: "🟣",
    title: "Niveau 5 — Avenir, couple & scénarios improbables",
    adult: false,
    cards: [
      {
        n: 209,
        text: "Si tu pouvais voir notre vie dans dix ans pendant cinq minutes, regarderais-tu ?",
      },
      {
        n: 210,
        text: "Quelle chose voudrais-tu absolument voir arriver dans notre futur ?",
      },
      {
        n: 211,
        text: "Quelle chose voudrais-tu absolument éviter ?",
      },
      {
        n: 212,
        text: "Où pourrais-tu réellement nous imaginer vivre ?",
      },
      {
        n: 213,
        text: "Quelle ville nous irait bizarrement bien ?",
      },
      {
        n: 214,
        text: "Quelle aventure de trois mois accepterais-tu avec moi ?",
      },
      {
        n: 215,
        text: "Quelle vie complètement différente pourrais-tu imaginer pour nous ?",
      },
      {
        n: 216,
        text: "Quel projet fou pourrait réellement nous ressembler ?",
      },
      {
        n: 217,
        text: "Quel rêve individuel veux-tu protéger même en couple ?",
      },
      {
        n: 218,
        text: "Quel rêve voudrais-tu qu'on construise ensemble ?",
      },
      {
        n: 219,
        text: "Quel type de maison nous correspondrait ?",
      },
      {
        n: 220,
        text: "Quel type de quotidien nous rendrait vraiment heureux ?",
      },
      {
        n: 221,
        text: "Quelle tradition de couple voudrais-tu avoir dans vingt ans ?",
      },
      {
        n: 222,
        text: "Quelle photo aimerais-tu qu'on ait dans vingt ans ?",
      },
      {
        n: 223,
        text: "Quelle erreur de couple aimerais-tu qu'on évite ?",
      },
      {
        n: 224,
        text: "Quelle chose pourrait nous rendre plus proches en vieillissant ?",
      },
      {
        n: 225,
        text: "Quelle chose pourrait au contraire nous éloigner ?",
      },
      {
        n: 226,
        text: "Quelle version de nous deux serait totalement inattendue ?",
      },
      {
        n: 227,
        text: "Quel pays aimerais-tu découvrir uniquement avec moi ?",
      },
      {
        n: 228,
        text: "Quelle aventure un peu folle ferait une excellente histoire à raconter ?",
      },
      {
        n: 229,
        text: "Si on devait disparaître pendant un mois, où irions-nous ?",
      },
      {
        n: 230,
        text: "Si on devait recommencer notre vie dans un autre pays ?",
      },
      {
        n: 231,
        text: "Si tu pouvais choisir notre voisin parfait ?",
      },
      {
        n: 232,
        text: "Si tu pouvais effacer une seule contrainte de notre vie actuelle ?",
      },
      {
        n: 233,
        text: "Si on gagnait énormément d'argent, quelle habitude changerait en premier ?",
      },
      {
        n: 234,
        text: "Si on perdait tout sauf nous deux, qu'est-ce qui compterait encore ?",
      },
      {
        n: 235,
        text: "Si on pouvait recommencer notre relation depuis zéro, que ferais-tu différemment ?",
      },
      {
        n: 236,
        text: "Quelle partie de notre histoire ne voudrais-tu surtout pas modifier ?",
      },
      {
        n: 237,
        text: "Quel moment de notre avenir as-tu hâte de vivre ?",
      },
      {
        n: 238,
        text: "Quel moment de notre avenir te fait un peu peur ?",
      },
      {
        n: 239,
        text: "Quelle aventure romantique voudrais-tu raconter à nos vieux jours ?",
      },
      {
        n: 240,
        text: "Quel endroit serait parfait pour une fuite improvisée à deux ?",
      },
      {
        n: 241,
        text: "Quelle chose voudrais-tu faire au moins une fois sans prévenir personne ?",
      },
      {
        n: 242,
        text: "Quel type de vacances ferait exploser notre routine ?",
      },
      {
        n: 243,
        text: "Quelle situation ferait ressortir notre meilleur côté ?",
      },
      {
        n: 244,
        text: "Quelle situation ferait ressortir notre pire côté ?",
      },
      {
        n: 245,
        text: "Si on devait vivre ensemble dans un hôtel pendant un mois, qui deviendrait fou en premier ?",
      },
      {
        n: 246,
        text: "Si nos vies étaient un film, quelle scène serait la fin idéale ?",
      },
      {
        n: 247,
        text: "Quelle scène n'a encore jamais eu lieu mais tu voudrais la vivre ?",
      },
      {
        n: 248,
        text: "Quelle scène complètement improbable pourrais-tu imaginer ?",
      },
      {
        n: 249,
        text: "Quelle aventure de dernière minute accepterais-tu ce soir ?",
      },
      {
        n: 250,
        text: "Quel souvenir futur voudrais-tu absolument créer ?",
      },
      {
        n: 251,
        text: "Quel anniversaire voudrais-tu rendre complètement inoubliable ?",
      },
      {
        n: 252,
        text: "Quel voyage aimerais-tu faire sans prendre une seule photo ?",
      },
      {
        n: 253,
        text: "Quelle expérience voudrais-tu garder uniquement pour nous ?",
      },
      {
        n: 254,
        text: "Quelle chose aimerais-tu raconter de nous à tes petits-enfants ?",
      },
      {
        n: 255,
        text: "Quel secret de couple devrait rester exclusivement à nous ?",
      },
      {
        n: 256,
        text: "Quelle chose pourrait encore complètement me surprendre dans dix ans ?",
      },
      {
        n: 257,
        text: "Quelle version de toi veux-tu devenir avec moi ?",
      },
      {
        n: 258,
        text: "Quelle version de moi aimerais-tu découvrir avec le temps ?",
      },
      {
        n: 259,
        text: "Qu'aimerais-tu qu'on se dise encore quand on aura 80 ans ?",
      },
      {
        n: 260,
        text: "Quelle question sur notre avenir n'oses-tu jamais poser ?",
      },
    ],
  },
  {
    id: "q6",
    emoji: "🌹",
    title: "Niveau 6 — Attraction, flirt & tension",
    adult: false,
    cards: [
      {
        n: 261,
        text: "À quel moment me trouves-tu le plus attirant(e) ?",
      },
      {
        n: 262,
        text: "Quelle expression de mon visage te fait le plus d'effet ?",
      },
      {
        n: 263,
        text: "Quelle tenue de moi t'a le plus marqué(e) ?",
      },
      {
        n: 264,
        text: "Quelle tenue aimerais-tu secrètement me voir porter ?",
      },
      {
        n: 265,
        text: "Quel détail physique chez moi remarques-tu immédiatement ?",
      },
      {
        n: 266,
        text: "Quel détail chez moi pourrais-tu regarder longtemps sans t'en lasser ?",
      },
      {
        n: 267,
        text: "Quel mouvement de ma part trouves-tu particulièrement séduisant ?",
      },
      {
        n: 268,
        text: "Quelle manière de parler chez moi te plaît le plus ?",
      },
      {
        n: 269,
        text: "Quel regard de moi te déstabilise ?",
      },
      {
        n: 270,
        text: "Quelle version de mon sourire préfères-tu ?",
      },
      {
        n: 271,
        text: "Quelle partie de mon caractère augmente mon attirance pour moi ?",
      },
      {
        n: 272,
        text: "Quel défaut chez moi devient étrangement séduisant ?",
      },
      {
        n: 273,
        text: "Quel geste innocent de ma part te fait davantage d'effet qu'il ne devrait ?",
      },
      {
        n: 274,
        text: "Quel type de proximité préfères-tu ?",
      },
      {
        n: 275,
        text: "Quel type de contact te donne des frissons ?",
      },
      {
        n: 276,
        text: "Qu'est-ce qui peut faire monter la tension en quelques secondes ?",
      },
      {
        n: 277,
        text: "Quelle ambiance te semble parfaite pour nous deux ?",
      },
      {
        n: 278,
        text: "Quel endroit banal devient sexy simplement parce qu'on y est seuls ?",
      },
      {
        n: 279,
        text: "Préfères-tu une séduction lente ou immédiate ?",
      },
      {
        n: 280,
        text: "Préfères-tu provoquer ou être provoqué(e) ?",
      },
      {
        n: 281,
        text: "Quel compliment venant de moi pourrait te faire rougir instantanément ?",
      },
      {
        n: 282,
        text: "Quel compliment très direct pourrais-tu me faire ?",
      },
      {
        n: 283,
        text: "Quel message de ma part pourrait te déconcentrer en pleine journée ?",
      },
      {
        n: 284,
        text: "Quelle phrase pourrais-tu m'envoyer pour me faire comprendre que tu penses à moi autrement ?",
      },
      {
        n: 285,
        text: "Quelle photo de moi pourrait te surprendre agréablement ?",
      },
      {
        n: 286,
        text: "Quelle chanson changerait instantanément l'ambiance ?",
      },
      {
        n: 287,
        text: "Quelle lumière préfères-tu pour une soirée très intime ?",
      },
      {
        n: 288,
        text: "Quel parfum associé à moi t'attire le plus ?",
      },
      {
        n: 289,
        text: "Quel lieu serait parfait pour un rendez-vous qui commence innocemment ?",
      },
      {
        n: 290,
        text: "Quelle surprise romantique pourrait te faire perdre tes mots ?",
      },
      {
        n: 291,
        text: "Quelle façon de m'approcher te plaît le plus ?",
      },
      {
        n: 292,
        text: "Quel type de baiser préfères-tu ?",
      },
      {
        n: 293,
        text: "Quel moment juste avant un baiser trouves-tu le plus intense ?",
      },
      {
        n: 294,
        text: "Quelle petite provocation trouves-tu irrésistible ?",
      },
      {
        n: 295,
        text: "Quelle phrase me concernant te paraît particulièrement dangereuse à dire à voix haute ?",
      },
      {
        n: 296,
        text: "Quelle chose je fais sans le savoir qui peut te faire perdre ta concentration ?",
      },
      {
        n: 297,
        text: "Quelle qualité chez moi est plus sexy que mon physique ?",
      },
      {
        n: 298,
        text: "Quel look de moi pourrait te faire changer tous tes plans ?",
      },
      {
        n: 299,
        text: "Quel regard entre nous pourrait remplacer une conversation entière ?",
      },
      {
        n: 300,
        text: "Quelle situation quotidienne pourrait facilement devenir très romantique ?",
      },
      {
        n: 301,
        text: "Quel type de rendez-vous te ferait le plus craquer ?",
      },
      {
        n: 302,
        text: "Quel endroit inhabituel serait parfait pour un baiser ?",
      },
      {
        n: 303,
        text: "Quel type de surprise aimerais-tu recevoir de moi sans savoir quand ?",
      },
      {
        n: 304,
        text: "Quel geste voudrais-tu que je fasse plus souvent ?",
      },
      {
        n: 305,
        text: "Quelle petite chose pourrais-tu faire uniquement pour me provoquer gentiment ?",
      },
      {
        n: 306,
        text: "Quel genre de flirt te fait perdre tes moyens ?",
      },
      {
        n: 307,
        text: "Quel type de teasing préfères-tu ?",
      },
      {
        n: 308,
        text: "Quel mot de passe secret pourrait signifier « rapproche-toi » ?",
      },
      {
        n: 309,
        text: "Quel signal secret pourrait signifier « j'ai envie de toi » ?",
      },
      {
        n: 310,
        text: "Quel moment récent as-tu trouvé particulièrement chargé entre nous ?",
      },
      {
        n: 311,
        text: "Quelle chose entre nous pourrait facilement devenir dangereusement séduisante ?",
      },
      {
        n: 312,
        text: "Quelle question de ce niveau espérais-tu secrètement que je te pose ?",
      },
    ],
  },
  {
    id: "q7",
    emoji: "🔥",
    title: "Niveau 7 — Hot seat : les questions qui font hésiter",
    adult: true,
    cards: [
      {
        n: 313,
        text: "Quelle est la chose la plus osée que tu aies imaginée avec moi ?",
      },
      {
        n: 314,
        text: "Quel désir as-tu déjà eu mais gardé pour toi ?",
      },
      {
        n: 315,
        text: "Quelle chose chez moi peut instantanément changer ton humeur ?",
      },
      {
        n: 316,
        text: "Quel type de scénario romantique te fait le plus fantasmer ?",
      },
      {
        n: 317,
        text: "Quelle situation inhabituelle te donnerait envie de m'embrasser ?",
      },
      {
        n: 318,
        text: "Quelle tenue portée par moi pourrait te faire perdre tout ton sérieux ?",
      },
      {
        n: 319,
        text: "Quel geste pourrait suffire à te faire comprendre exactement ce que je veux ?",
      },
      {
        n: 320,
        text: "Quelle phrase chuchotée pourrait te faire complètement rougir ?",
      },
      {
        n: 321,
        text: "Quel compliment très direct voudrais-tu entendre de ma part ?",
      },
      {
        n: 322,
        text: "Quel compliment encore plus direct pourrais-tu me dire ?",
      },
      {
        n: 323,
        text: "Quelle partie de mon attitude est la plus dangereuse pour toi ?",
      },
      {
        n: 324,
        text: "Quelle version de moi te semble la plus irrésistible ?",
      },
      {
        n: 325,
        text: "Quelle version de toi aimerais-tu que je voie davantage le soir ?",
      },
      {
        n: 326,
        text: "Quelle situation « normalement innocente » pourrait devenir très tentante ?",
      },
      {
        n: 327,
        text: "Quel type de proximité te rend le plus difficile à distraire ?",
      },
      {
        n: 328,
        text: "Quel genre de message aimerais-tu recevoir quand on est séparés ?",
      },
      {
        n: 329,
        text: "Quelle phrase pourrais-tu m'envoyer pour me faire comprendre que ce soir ne sera pas une soirée normale ?",
      },
      {
        n: 330,
        text: "Quelle surprise accepterais-tu sans connaître le programme ?",
      },
      {
        n: 331,
        text: "Quelle surprise pourrais-tu préparer pour moi ?",
      },
      {
        n: 332,
        text: "Quel rendez-vous pourrait se transformer en quelque chose de beaucoup plus intense ?",
      },
      {
        n: 333,
        text: "Quelle ambiance te fait le plus facilement lâcher prise ?",
      },
      {
        n: 334,
        text: "Quel souvenir de nous te revient quand tu penses au désir ?",
      },
      {
        n: 335,
        text: "Quelle attitude de ma part te fait te sentir particulièrement désiré(e) ?",
      },
      {
        n: 336,
        text: "Quel type d'initiative aimerais-tu que je prenne plus souvent ?",
      },
      {
        n: 337,
        text: "Quel type d'initiative aimerais-tu prendre davantage ?",
      },
      {
        n: 338,
        text: "Quel jeu de séduction pourrais-tu accepter sans connaître les règles ?",
      },
      {
        n: 339,
        text: "Quelle règle de séduction pourrais-tu inventer pour nous ?",
      },
      {
        n: 340,
        text: "Quel défi me lancerais-tu si tu savais que je devrais répondre honnêtement ?",
      },
      {
        n: 341,
        text: "Quelle question osée voudrais-tu qu'on se pose mutuellement ?",
      },
      {
        n: 342,
        text: "Quelle réponse te surprendrait le plus venant de moi ?",
      },
      {
        n: 343,
        text: "Quel secret sur tes envies pourrais-tu me révéler ?",
      },
      {
        n: 344,
        text: "Quelle chose as-tu déjà voulu me demander sans jamais oser ?",
      },
      {
        n: 345,
        text: "Quel scénario fictif aimerais-tu jouer dans un jeu de couple ?",
      },
      {
        n: 346,
        text: "Quel rôle te semblerait amusant à essayer dans ce jeu ?",
      },
      {
        n: 347,
        text: "Préfères-tu diriger le jeu ou découvrir ce que l'autre a préparé ?",
      },
      {
        n: 348,
        text: "Qu'est-ce qui te semble plus excitant : savoir, imaginer ou être surpris(e) ?",
      },
      {
        n: 349,
        text: "Quelle chose peut te rendre nerveux/sexe… sans aucun contact ?",
      },
      {
        n: 350,
        text: "Quel genre de regard te donne le plus de frissons ?",
      },
      {
        n: 351,
        text: "Quelle situation pourrait te faire perdre complètement la notion du temps ?",
      },
      {
        n: 352,
        text: "Quelle chose aimerais-tu qu'on ose plus souvent dire à voix haute ?",
      },
      {
        n: 353,
        text: "Quelle envie est facile à imaginer mais difficile à avouer ?",
      },
      {
        n: 354,
        text: "Quel secret pourrais-tu confier uniquement dans le noir ?",
      },
      {
        n: 355,
        text: "Quelle question te ferait probablement détourner les yeux ?",
      },
      {
        n: 356,
        text: "Quel serait ton niveau de gêne sur 10 pour parler ouvertement de tes fantasmes ?",
      },
      {
        n: 357,
        text: "Quelle question pourrais-tu me poser pour faire monter le niveau sans être explicite ?",
      },
      {
        n: 358,
        text: "Quel mot te paraît le plus séduisant lorsqu'il vient de moi ?",
      },
      {
        n: 359,
        text: "Quelle sorte de silence entre nous serait le plus intense ?",
      },
      {
        n: 360,
        text: "Quelle situation pourrait nous faire rire alors qu'elle est extrêmement chargée ?",
      },
      {
        n: 361,
        text: "Quelle chose aimerais-tu qu'on essaye d'une manière totalement différente ?",
      },
      {
        n: 362,
        text: "Quelle curiosité intime n'as-tu jamais osé formuler ?",
      },
      {
        n: 363,
        text: "Quelle réponse pourrais-tu me donner que je ne suis pas prêt(e) à entendre ?",
      },
      {
        n: 364,
        text: "Quelle question aimerais-tu que je te pose juste après celle-ci ?",
      },
    ],
  },
  {
    id: "q8",
    emoji: "💋",
    title: "Niveau 8 — Intimité, fantasmes & goûts cachés",
    adult: true,
    cards: [
      {
        n: 365,
        text: "Quelle est la chose la plus inattendue qui peut te mettre dans l'ambiance ?",
      },
      {
        n: 366,
        text: "Quel type de séduction te touche plus que prévu ?",
      },
      {
        n: 367,
        text: "Qu'est-ce qui te fait te sentir vraiment désiré(e) ?",
      },
      {
        n: 368,
        text: "Qu'est-ce qui te donne le sentiment d'être particulièrement séduisant(e) ?",
      },
      {
        n: 369,
        text: "Quel type de compliment intime te touche le plus ?",
      },
      {
        n: 370,
        text: "Quel type de compliment te ferait instantanément rougir ?",
      },
      {
        n: 371,
        text: "Quelle ambiance te met complètement à l'aise pour parler de désir ?",
      },
      {
        n: 372,
        text: "Quelle ambiance te ferait sortir de ta zone de confort ?",
      },
      {
        n: 373,
        text: "Quelle place la nouveauté devrait-elle avoir dans une relation longue ?",
      },
      {
        n: 374,
        text: "Quelle place la surprise devrait-elle avoir ?",
      },
      {
        n: 375,
        text: "Quelle place le jeu devrait-il avoir ?",
      },
      {
        n: 376,
        text: "Quelle place le romantisme devrait-il garder quand une relation devient très familière ?",
      },
      {
        n: 377,
        text: "Qu'est-ce qui rend un moment intime mémorable pour toi ?",
      },
      {
        n: 378,
        text: "Qu'est-ce qui peut détruire une ambiance immédiatement ?",
      },
      {
        n: 379,
        text: "Quelle chose voudrais-tu qu'on ose davantage verbaliser ?",
      },
      {
        n: 380,
        text: "Quelle chose est plus importante pour toi : anticipation ou spontanéité ?",
      },
      {
        n: 381,
        text: "Quelle sorte de tension préfères-tu : lente, intense ou imprévisible ?",
      },
      {
        n: 382,
        text: "Quel détail de l'environnement peut complètement changer ton humeur ?",
      },
      {
        n: 383,
        text: "Quelle musique créerait immédiatement une ambiance différente ?",
      },
      {
        n: 384,
        text: "Quelle heure te paraît la plus propice à la séduction ?",
      },
      {
        n: 385,
        text: "Quel endroit privé t'attire le plus pour une soirée particulière ?",
      },
      {
        n: 386,
        text: "Quel endroit inhabituel te semblerait excitant tout en restant confortable ?",
      },
      {
        n: 387,
        text: "Quelle idée de rendez-vous un peu audacieuse voudrais-tu tester ?",
      },
      {
        n: 388,
        text: "Quel type de jeu de couple t'intrigue ?",
      },
      {
        n: 389,
        text: "Quel jeu ne t'attirerait absolument pas ?",
      },
      {
        n: 390,
        text: "Quel genre de défi te ferait rire tout en te mettant légèrement mal à l'aise ?",
      },
      {
        n: 391,
        text: "Quelle limite te semble particulièrement importante ?",
      },
      {
        n: 392,
        text: "Quelle question sur les limites devrait être posée plus souvent ?",
      },
      {
        n: 393,
        text: "Quelle chose faut-il absolument pouvoir dire sans honte dans un couple ?",
      },
      {
        n: 394,
        text: "Quelle chose voudrais-tu pouvoir demander sans peur d'être jugé(e) ?",
      },
      {
        n: 395,
        text: "Quel type de refus te semble le plus difficile à entendre ?",
      },
      {
        n: 396,
        text: "Quel type de « oui » te semble le plus excitant ?",
      },
      {
        n: 397,
        text: "Quelle envie aimerais-tu simplement pouvoir raconter sans obligation de la réaliser ?",
      },
      {
        n: 398,
        text: "Quelle curiosité aimerais-tu explorer uniquement dans la conversation ?",
      },
      {
        n: 399,
        text: "Quel fantasme de couple te semble intriguant même si tu ne sais pas si tu le réaliserais ?",
      },
      {
        n: 400,
        text: "Quelle idée te paraît excitante uniquement parce qu'elle est inhabituelle ?",
      },
      {
        n: 401,
        text: "Quel scénario fictif te ferait instantanément sortir de ton sérieux ?",
      },
      {
        n: 402,
        text: "Quelle version de notre couple imaginaire serait la plus dangereuse ?",
      },
      {
        n: 403,
        text: "Quelle règle de couple pourrais-tu suspendre pendant une soirée spéciale ?",
      },
      {
        n: 404,
        text: "Quelle nouvelle chose aimerais-tu découvrir sur ton propre désir ?",
      },
      {
        n: 405,
        text: "Quelle chose aimerais-tu découvrir sur le désir de ton partenaire ?",
      },
      {
        n: 406,
        text: "Quelle question sexuelle te semble la plus difficile à poser ?",
      },
      {
        n: 407,
        text: "Quelle question sexuelle aimerais-tu qu'on te pose franchement ?",
      },
      {
        n: 408,
        text: "Quelle information sur tes goûts pourrait me surprendre ?",
      },
      {
        n: 409,
        text: "Quelle information sur mes goûts aimerais-tu découvrir ?",
      },
      {
        n: 410,
        text: "Quelle chose pourrais-tu avouer uniquement si l'autre promet de ne pas se moquer ?",
      },
      {
        n: 411,
        text: "Quelle confession te ferait probablement rougir jusqu'aux oreilles ?",
      },
      {
        n: 412,
        text: "Quel sujet intime as-tu le plus envie de dédramatiser ?",
      },
      {
        n: 413,
        text: "Quel désir est pour toi davantage émotionnel que physique ?",
      },
      {
        n: 414,
        text: "Quel désir est davantage lié à la nouveauté ?",
      },
      {
        n: 415,
        text: "Quelle expérience imaginaire voudrais-tu pouvoir vivre pendant une heure ?",
      },
      {
        n: 416,
        text: "Quelle question de cette section te semble dangereusement intéressante ?",
      },
    ],
  },
  {
    id: "q9",
    emoji: "🌶️",
    title: "Niveau 9 — Très hot, direct & embarrassant",
    adult: true,
    cards: [
      {
        n: 417,
        text: "Quelle est la pensée la plus osée que tu as eue à mon sujet récemment ?",
      },
      {
        n: 418,
        text: "Quel fantasme aimerais-tu que je sache que tu as, même sans vouloir le réaliser ?",
      },
      {
        n: 419,
        text: "Quelle chose chez moi te donne le plus envie de perdre ton self-control ?",
      },
      {
        n: 420,
        text: "Quelle situation pourrait te faire craquer alors qu'elle commence de manière totalement banale ?",
      },
      {
        n: 421,
        text: "Quelle version de moi pourrait te faire complètement perdre tes moyens ?",
      },
      {
        n: 422,
        text: "Quelle version de toi-même aimerais-tu oser davantage avec moi ?",
      },
      {
        n: 423,
        text: "Quelle chose aimerais-tu que je fasse uniquement pour te provoquer ?",
      },
      {
        n: 424,
        text: "Quelle chose aimerais-tu faire uniquement pour me provoquer ?",
      },
      {
        n: 425,
        text: "Quel serait ton scénario parfait pour une soirée où le but est uniquement de créer de la tension ?",
      },
      {
        n: 426,
        text: "Quelle surprise très audacieuse accepterais-tu de ma part ?",
      },
      {
        n: 427,
        text: "Quelle surprise très audacieuse pourrais-tu me préparer ?",
      },
      {
        n: 428,
        text: "Quelle phrase très directe aimerais-tu entendre de moi ?",
      },
      {
        n: 429,
        text: "Quelle phrase encore plus directe pourrais-tu me dire ?",
      },
      {
        n: 430,
        text: "Quel message pourrait me faire comprendre instantanément ce que tu veux sans le dire clairement ?",
      },
      {
        n: 431,
        text: "Quel mot ou surnom te semblerait particulièrement excitant venant de moi ?",
      },
      {
        n: 432,
        text: "Quel regard de moi pourrait suffire à changer complètement l'ambiance ?",
      },
      {
        n: 433,
        text: "Quelle tenue serait presque injuste parce qu'elle te déconcentrerait immédiatement ?",
      },
      {
        n: 434,
        text: "Quel lieu inattendu te ferait fantasmer sur nous deux ?",
      },
      {
        n: 435,
        text: "Quel type de rendez-vous pourrait devenir le plus électrique ?",
      },
      {
        n: 436,
        text: "Quel type de proximité préfères-tu quand la tension est déjà très forte ?",
      },
      {
        n: 437,
        text: "Préfères-tu faire durer le suspense ou savoir rapidement où ça va ?",
      },
      {
        n: 438,
        text: "Quelle situation de « presque » est plus excitante pour toi que quelque chose de prévisible ?",
      },
      {
        n: 439,
        text: "Quelle chose te fait rougir même quand tu sais que c'est parfaitement normal ?",
      },
      {
        n: 440,
        text: "Quel désir n'as-tu jamais osé formuler parce que tu avais peur qu'il paraisse bizarre ?",
      },
      {
        n: 441,
        text: "Quel intérêt ou fantasme serais-tu le plus curieux/curieuse d'explorer à deux ?",
      },
      {
        n: 442,
        text: "Quelle chose serais-tu curieux/curieuse de regarder, lire ou imaginer ensemble ?",
      },
      {
        n: 443,
        text: "Quelle idée de jeu de rôle te ferait rire avant de potentiellement t'intéresser ?",
      },
      {
        n: 444,
        text: "Quel personnage ou type de personnage pourrais-tu jouer dans un jeu de séduction ?",
      },
      {
        n: 445,
        text: "Quel rôle aimerais-tu que je joue ?",
      },
      {
        n: 446,
        text: "Préfères-tu avoir le contrôle du scénario ou découvrir ce que l'autre a imaginé ?",
      },
      {
        n: 447,
        text: "Quelle situation de pouvoir symbolique dans un jeu de couple t'intrigue le plus ?",
      },
      {
        n: 448,
        text: "Quelle situation de pouvoir symbolique ne t'attire absolument pas ?",
      },
      {
        n: 449,
        text: "Quelle chose un peu taboue te rend curieux/curieuse ?",
      },
      {
        n: 450,
        text: "Quel fantasme serais-tu capable de raconter mais pas forcément d'essayer ?",
      },
      {
        n: 451,
        text: "Quelle confession venant de moi pourrait réellement te surprendre ?",
      },
      {
        n: 452,
        text: "Quelle confession venant de toi pourrait réellement me surprendre ?",
      },
      {
        n: 453,
        text: "Quel désir pourrait exister chez toi sans que tu aies envie de le réaliser ?",
      },
      {
        n: 454,
        text: "Quel détail de ton imaginaire romantique ou sexuel est très différent de ce que les gens supposeraient ?",
      },
      {
        n: 455,
        text: "Quel type de scénario te plaît davantage dans ton imagination que dans la réalité ?",
      },
      {
        n: 456,
        text: "Quel scénario réel pourrait être bien plus excitant que tu ne l'imagines ?",
      },
      {
        n: 457,
        text: "Quelle question pourrais-tu me poser sous couvert de plaisanterie mais dont tu voudrais vraiment connaître la réponse ?",
      },
      {
        n: 458,
        text: "Quelle chose voudrais-tu entendre de moi sans jamais avoir à la demander ?",
      },
      {
        n: 459,
        text: "Quelle chose voudrais-tu que je devine ?",
      },
      {
        n: 460,
        text: "Quelle limite pourrais-tu avoir envie de repousser uniquement après en avoir longuement parlé ?",
      },
      {
        n: 461,
        text: "Quelle aventure de couple te semblerait folle mais potentiellement mémorable ?",
      },
      {
        n: 462,
        text: "Quelle règle « normalement raisonnable » pourrais-tu avoir envie de contourner pour une nuit ?",
      },
      {
        n: 463,
        text: "Quel niveau de franchise sexuelle aimerais-tu réellement avoir entre nous ?",
      },
      {
        n: 464,
        text: "Quelle question oserais-tu poser après deux verres mais pas complètement sobre ?",
      },
      {
        n: 465,
        text: "Quelle chose pourrais-tu avouer seulement à minuit passé ?",
      },
      {
        n: 466,
        text: "Quelle question te ferait absolument regarder ailleurs avant de répondre ?",
      },
      {
        n: 467,
        text: "Quelle réponse de ma part pourrait changer l'ambiance en trois secondes ?",
      },
      {
        n: 468,
        text: "Quelle question de cette section te semble la plus dangereuse ?",
      },
    ],
  },
  {
    id: "q10",
    emoji: "🔥🔥",
    title: "Niveau 10 — Hyper hot / sans filtre",
    adult: true,
    cards: [
      {
        n: 469,
        text: "Quel est le fantasme que tu as le plus de mal à avouer ?",
      },
      {
        n: 470,
        text: "Quelle envie sexuelle t'a déjà traversé l'esprit sans que je m'en doute ?",
      },
      {
        n: 471,
        text: "Quelle chose très audacieuse aimerais-tu que je te propose ?",
      },
      {
        n: 472,
        text: "Quelle chose très audacieuse aimerais-tu me proposer toi-même ?",
      },
      {
        n: 473,
        text: "Quel scénario de couple complètement hors de notre routine te tenterait le plus ?",
      },
      {
        n: 474,
        text: "Quelle version « interdite » de notre couple imaginaire te fascine ?",
      },
      {
        n: 475,
        text: "Quel type de jeu entre nous pourrait te rendre particulièrement vulnérable ?",
      },
      {
        n: 476,
        text: "Quelle situation te ferait aimer perdre un peu le contrôle, dans un cadre où tu te sens totalement en confiance ?",
      },
      {
        n: 477,
        text: "Quel scénario te plairait davantage comme fantasme que comme réalité ?",
      },
      {
        n: 478,
        text: "Quel scénario aimerais-tu réellement envisager à deux ?",
      },
      {
        n: 479,
        text: "Quelle curiosité intime as-tu gardée secrète le plus longtemps ?",
      },
      {
        n: 480,
        text: "Quelle chose chez toi aimerais-tu que je découvre sans que tu me l'expliques d'abord ?",
      },
      {
        n: 481,
        text: "Quelle chose chez moi aimerais-tu découvrir de manière totalement inattendue ?",
      },
      {
        n: 482,
        text: "Quelle question sexuelle très directe n'as-tu jamais osé me poser ?",
      },
      {
        n: 483,
        text: "Quelle question sexuelle aimerais-tu que je te pose sans détour ?",
      },
      {
        n: 484,
        text: "Quel fantasme te ferait le plus rougir si je devinais correctement ?",
      },
      {
        n: 485,
        text: "Quel désir pourrais-tu avouer uniquement si tu savais que je ne te jugerais jamais ?",
      },
      {
        n: 486,
        text: "Quelle idée t'a déjà semblé trop audacieuse pour être formulée à voix haute ?",
      },
      {
        n: 487,
        text: "Quelle idée pourrais-tu au contraire envisager maintenant ?",
      },
      {
        n: 488,
        text: "Quelle expérience de couple te semble « absolument pas nous » mais te donne quand même envie d'y réfléchir ?",
      },
      {
        n: 489,
        text: "Quelle forme de nouveauté pourrait raviver énormément notre tension ?",
      },
      {
        n: 490,
        text: "Quel type de scénario à deux te ferait sentir extrêmement désiré(e) ?",
      },
      {
        n: 491,
        text: "Quel type de scénario te ferait te sentir particulièrement séduisant(e) ?",
      },
      {
        n: 492,
        text: "Quel type de rôle ou d'attitude chez moi pourrait le plus t'attirer ?",
      },
      {
        n: 493,
        text: "Quel rôle ou quelle attitude chez toi aimerais-tu me montrer ?",
      },
      {
        n: 494,
        text: "Quelle situation où quelqu'un d'autre nous regarde te semblerait intrigante à imaginer ?",
      },
      {
        n: 495,
        text: "Quel scénario impliquant la jalousie te fascine comme fantasme, même si tu ne voudrais pas le vivre réellement ?",
      },
      {
        n: 496,
        text: "Quelle situation de séduction avec une tierce personne serait pour toi totalement hors limite ?",
      },
      {
        n: 497,
        text: "Quelle situation pourrait simplement rester un fantasme sans jamais devenir réelle ?",
      },
      {
        n: 498,
        text: "Quelle expérience de couple « hors norme » pourrais-tu envisager après une longue discussion ?",
      },
      {
        n: 499,
        text: "Quel type de secret intime serais-tu prêt(e) à révéler ce soir ?",
      },
      {
        n: 500,
        text: "Quelle chose que tu désires le plus aimerais-tu que je prenne l'initiative d'aborder ?",
      },
      {
        n: 501,
        text: "Quelle proposition venant de moi te ferait répondre « laisse-moi réfléchir » plutôt que « non » ?",
      },
      {
        n: 502,
        text: "Quelle proposition venant de moi te ferait immédiatement savoir que tu veux en parler davantage ?",
      },
      {
        n: 503,
        text: "Quelle chose pourrait être excitante précisément parce qu'elle est nouvelle pour nous deux ?",
      },
      {
        n: 504,
        text: "Quel fantasme aimerais-tu explorer d'abord en imagination ?",
      },
      {
        n: 505,
        text: "Quel fantasme aimerais-tu simplement raconter dans les moindres grandes lignes ?",
      },
      {
        n: 506,
        text: "Quel sujet intime voudrais-tu qu'on rende totalement normal entre nous ?",
      },
      {
        n: 507,
        text: "Quel désir pensais-tu ne jamais avoir avant de tomber amoureux/amoureuse ?",
      },
      {
        n: 508,
        text: "Quelle chose te fait davantage d'effet : être désiré(e), surprendre ou être surpris(e) ?",
      },
      {
        n: 509,
        text: "Quelle sorte de tension aimerais-tu prolonger beaucoup plus longtemps ?",
      },
      {
        n: 510,
        text: "Quelle chose voudrais-tu pouvoir me demander sans avoir à prendre ton courage à deux mains ?",
      },
      {
        n: 511,
        text: "Quelle question très sexuelle pourrait te faire perdre instantanément ton assurance ?",
      },
      {
        n: 512,
        text: "Quelle réponse venant de moi pourrait complètement bouleverser ton image de moi ?",
      },
      {
        n: 513,
        text: "Quel secret sur ton imaginaire n'as-tu encore jamais partagé avec personne ?",
      },
      {
        n: 514,
        text: "Quelle chose pourrais-tu confesser seulement dans un contexte où nous sommes totalement seuls ?",
      },
      {
        n: 515,
        text: "Quelle envie pourrais-tu admettre aujourd'hui alors qu'elle t'aurait gêné(e) il y a cinq ans ?",
      },
      {
        n: 516,
        text: "Quelle expérience n'essaierais-tu jamais mais adores-tu l'idée d'en parler ?",
      },
      {
        n: 517,
        text: "Quelle chose voudrais-tu qu'on ose explorer uniquement si on est tous les deux parfaitement à l'aise ?",
      },
      {
        n: 518,
        text: "Quelle question espérais-tu secrètement trouver dans cette liste et qui n'y est pas ?",
      },
      {
        n: 519,
        text: "Quelle question n'aurais-tu jamais pensé que je pourrais avoir le courage de te poser ?",
      },
      {
        n: 520,
        text: "Quelle vérité sur tes désirs aimerais-tu que je découvre ce soir, alors que je ne la connais probablement pas encore ?",
      },
    ],
  },
];

export const CHALLENGE_DECKS: (Deck & { pile: ChallengePile })[] = [
  {
    id: "c1",
    emoji: "🟢",
    title: "Chaos créatif",
    adult: false,
    pile: "party",
    cards: [
      {
        n: 1,
        text: "Fais une bande-annonce dramatique de ta propre vie avec les objets présents.",
      },
      {
        n: 2,
        text: "Vends l'objet le plus moche de la pièce comme s'il valait 50 000 €.",
      },
      {
        n: 3,
        text: "Invente un scandale totalement faux impliquant deux personnes présentes.",
      },
      {
        n: 4,
        text: "Fais une conférence TED de 90 secondes sur ton pire défaut.",
      },
      {
        n: 5,
        text: "Raconte ta journée comme si tu étais le narrateur d'un documentaire animalier.",
      },
      {
        n: 6,
        text: "Invente un métier dont personne n'a besoin et convaincs le groupe qu'il est indispensable.",
      },
      {
        n: 7,
        text: "Choisis un objet et invente toute son histoire.",
      },
      {
        n: 8,
        text: "Fais une déclaration extrêmement passionnée à une chaise.",
      },
      {
        n: 9,
        text: "Fais un discours de victoire alors que tu n'as rien gagné.",
      },
      {
        n: 10,
        text: "Transforme une anecdote banale en film d'horreur.",
      },
      {
        n: 11,
        text: "Décris la personne à ta droite comme un produit de luxe.",
      },
      {
        n: 12,
        text: "Invente une théorie du complot expliquant pourquoi deux personnes du groupe se sont rencontrées.",
      },
      {
        n: 13,
        text: "Fais une météo extrêmement sérieuse de l'ambiance actuelle.",
      },
      {
        n: 14,
        text: "Crée un slogan pour chaque personne.",
      },
      {
        n: 15,
        text: "Invente le titre et le synopsis d'une série basée sur votre soirée.",
      },
      {
        n: 16,
        text: "Fais une scène de rupture avec un objet.",
      },
      {
        n: 17,
        text: "Imite quelqu'un sans reproduire sa voix.",
      },
      {
        n: 18,
        text: "Invente une règle obligatoire pour toutes les soirées.",
      },
      {
        n: 19,
        text: "Transforme trois objets en personnages et fais-les se disputer.",
      },
      {
        n: 20,
        text: "Fais rire quelqu'un sans parler, chanter ni toucher personne.",
      },
    ],
  },
  {
    id: "c2",
    emoji: "🕵️",
    title: "Missions secrètes",
    adult: false,
    pile: "party",
    cards: [
      {
        n: 21,
        text: "Fais prononcer « banane » à quelqu'un sans jamais le dire toi-même.",
      },
      {
        n: 22,
        text: "Fais changer quelqu'un de place trois fois sans le lui demander directement.",
      },
      {
        n: 23,
        text: "Convaincs quelqu'un que tu as oublié quelque chose d'important.",
      },
      {
        n: 24,
        text: "Obtiens trois fois la même réponse à trois questions différentes.",
      },
      {
        n: 25,
        text: "Fais toucher un objet précis à trois personnes.",
      },
      {
        n: 26,
        text: "Place discrètement le même mot dans cinq conversations.",
      },
      {
        n: 27,
        text: "Fais croire à quelqu'un que tu connais une anecdote secrète sur lui/elle.",
      },
      {
        n: 28,
        text: "Fais choisir deux fois de suite la même personne lors d'un vote.",
      },
      {
        n: 29,
        text: "Crée une expression que deux personnes finiront par reprendre.",
      },
      {
        n: 30,
        text: "Fais poser une question précise à quelqu'un sans la lui demander.",
      },
      {
        n: 31,
        text: "Convaincs quelqu'un de regarder derrière lui.",
      },
      {
        n: 32,
        text: "Fais applaudir le groupe sans dire « bravo ».",
      },
      {
        n: 33,
        text: "Fais prononcer le nom d'un objet choisi à l'avance.",
      },
      {
        n: 34,
        text: "Fais croire pendant une minute que tu as reçu une information secrète.",
      },
      {
        n: 35,
        text: "Fais raconter son dernier voyage à quelqu'un sans demander où il est allé.",
      },
      {
        n: 36,
        text: "Fais rire une personne précise trois fois dans la soirée.",
      },
      {
        n: 37,
        text: "Fais choisir à quelqu'un une chanson que tu avais secrètement anticipée.",
      },
      {
        n: 38,
        text: "Obtiens un high-five sans demander de high-five.",
      },
      {
        n: 39,
        text: "Fais changer complètement de sujet une conversation sans que cela se remarque.",
      },
      {
        n: 40,
        text: "Fais deviner ta mission sans révéler directement ce qu'elle était.",
      },
    ],
  },
  {
    id: "c3",
    emoji: "🟡",
    title: "Impro & personnages",
    adult: false,
    pile: "party",
    cards: [
      {
        n: 41,
        text: "Joue quelqu'un qui vient de découvrir Internet.",
      },
      {
        n: 42,
        text: "Joue ton partenaire comme un milliardaire arrogant.",
      },
      {
        n: 43,
        text: "Fais semblant d'être interviewé(e) après un scandale médiatique.",
      },
      {
        n: 44,
        text: "Joue un serveur qui déteste secrètement ses clients.",
      },
      {
        n: 45,
        text: "Fais une rencontre romantique entre deux personnes qui se détestent.",
      },
      {
        n: 46,
        text: "Joue ton propre clone.",
      },
      {
        n: 47,
        text: "Fais comme si tu étais une IA essayant de comprendre les humains.",
      },
      {
        n: 48,
        text: "Joue quelqu'un qui ment très mal.",
      },
      {
        n: 49,
        text: "Fais une dispute entre ton toi actuel et ton toi de 10 ans.",
      },
      {
        n: 50,
        text: "Joue quelqu'un persuadé d'être suivi par des pigeons.",
      },
      {
        n: 51,
        text: "Fais un entretien d'embauche pour un métier absurde.",
      },
      {
        n: 52,
        text: "Joue le meilleur ami jaloux d'un objet.",
      },
      {
        n: 53,
        text: "Joue quelqu'un qui essaie de rompre sans dire « rupture ».",
      },
      {
        n: 54,
        text: "Joue une célébrité qui essaie désespérément de rester anonyme.",
      },
      {
        n: 55,
        text: "Joue quelqu'un qui découvre qu'il est dans une émission de télé-réalité.",
      },
      {
        n: 56,
        text: "Fais une scène où tu essaies de convaincre quelqu'un de partir avec toi vers une destination inconnue.",
      },
      {
        n: 57,
        text: "Joue un détective qui enquête sur la disparition d'une chaussette.",
      },
      {
        n: 58,
        text: "Joue un gourou qui vient de découvrir la puissance du grille-pain.",
      },
      {
        n: 59,
        text: "Joue ton partenaire comme si tu le/la rencontrais pour la première fois.",
      },
      {
        n: 60,
        text: "Le groupe choisit ton personnage.",
      },
    ],
  },
  {
    id: "c4",
    emoji: "🧠",
    title: "Psycho & perception",
    adult: false,
    pile: "party",
    cards: [
      {
        n: 61,
        text: "Regarde quelqu'un 20 secondes puis décris exactement ce qu'il/elle dégage.",
      },
      {
        n: 62,
        text: "Devine qui répondra le premier à une question.",
      },
      {
        n: 63,
        text: "Choisis deux personnes qui ont selon toi la même énergie.",
      },
      {
        n: 64,
        text: "Dis qui serait le plus difficile à impressionner.",
      },
      {
        n: 65,
        text: "Devine qui serait le plus susceptible de garder un gros secret.",
      },
      {
        n: 66,
        text: "Choisis quelqu'un et devine son plus gros défaut en couple.",
      },
      {
        n: 67,
        text: "Devine qui prend le plus ses décisions à l'instinct.",
      },
      {
        n: 68,
        text: "Décris quelqu'un sans parler de son physique.",
      },
      {
        n: 69,
        text: "Devine qui a le plus changé ces dernières années.",
      },
      {
        n: 70,
        text: "Classe trois personnes selon leur capacité à improviser.",
      },
      {
        n: 71,
        text: "Devine qui survivrait le mieux à une catastrophe.",
      },
      {
        n: 72,
        text: "Donne à quelqu'un une qualité qu'il/elle ne remarque probablement pas.",
      },
      {
        n: 73,
        text: "Devine qui serait le plus dangereux avec beaucoup d'argent.",
      },
      {
        n: 74,
        text: "Devine qui serait le meilleur menteur.",
      },
      {
        n: 75,
        text: "Devine qui tomberait amoureux le plus vite dans une autre réalité.",
      },
      {
        n: 76,
        text: "Devine qui pourrait complètement changer de vie demain.",
      },
      {
        n: 77,
        text: "Trouve une personne qui te ressemble sur un point inattendu.",
      },
      {
        n: 78,
        text: "Trouve quelqu'un qui te ressemble absolument pas mais avec qui tu pourrais t'entendre.",
      },
      {
        n: 79,
        text: "Dis une chose que le groupe se trompe probablement à ton sujet.",
      },
      {
        n: 80,
        text: "Laisse le groupe deviner ton plus gros « red flag ».",
      },
    ],
  },
  {
    id: "c5",
    emoji: "🎨",
    title: "Création à deux",
    adult: false,
    pile: "party",
    cards: [
      {
        n: 81,
        text: "Construisez un personnage fictif en 60 secondes.",
      },
      {
        n: 82,
        text: "Dessinez-vous sans regarder la feuille.",
      },
      {
        n: 83,
        text: "Écrivez le pire premier rendez-vous imaginable.",
      },
      {
        n: 84,
        text: "Inventez une entreprise et son produit en cinq minutes.",
      },
      {
        n: 85,
        text: "Créez votre propre jeu avec trois règles.",
      },
      {
        n: 86,
        text: "Écrivez chacun trois mots puis créez une histoire.",
      },
      {
        n: 87,
        text: "Faites une photo qui pourrait servir de pochette d'album.",
      },
      {
        n: 88,
        text: "Inventez une tradition que vous devrez garder un an.",
      },
      {
        n: 89,
        text: "Créez une poignée de main.",
      },
      {
        n: 90,
        text: "Imaginez votre vie si vous vous étiez rencontrés dix ans plus tôt.",
      },
      {
        n: 91,
        text: "Inventez un mot et sa définition.",
      },
      {
        n: 92,
        text: "Créez une règle de couple complètement absurde.",
      },
      {
        n: 93,
        text: "Écrivez chacun un secret imaginaire et essayez de deviner celui de l'autre.",
      },
      {
        n: 94,
        text: "Faites une fausse couverture de magazine sur votre soirée.",
      },
      {
        n: 95,
        text: "Inventez une mission que vous pourriez réellement accepter demain.",
      },
      {
        n: 96,
        text: "Créez le plan d'une soirée parfaite en trois étapes.",
      },
      {
        n: 97,
        text: "Dessinez votre couple sans dessiner de personne.",
      },
      {
        n: 98,
        text: "Donnez un titre de film à votre relation.",
      },
      {
        n: 99,
        text: "Imaginez votre couple à 80 ans et jouez la scène.",
      },
      {
        n: 100,
        text: "Inventez un défi que même vous ne seriez pas sûrs de réussir.",
      },
    ],
  },
  {
    id: "c6",
    emoji: "🔴",
    title: "Culot & gêne",
    adult: false,
    pile: "party",
    cards: [
      {
        n: 101,
        text: "Demande à quelqu'un sa première impression de toi.",
      },
      {
        n: 102,
        text: "Fais raconter à quelqu'un une histoire jamais racontée au groupe.",
      },
      {
        n: 103,
        text: "Donne ton avis sincère sur une habitude ridicule que tu as.",
      },
      {
        n: 104,
        text: "Avoue quelque chose que tu fais seulement quand personne ne regarde.",
      },
      {
        n: 105,
        text: "Raconte ton moment social le plus gênant.",
      },
      {
        n: 106,
        text: "Dis quelle situation te rend immédiatement jaloux/jalouse.",
      },
      {
        n: 107,
        text: "Avoue le dernier moment où tu as fait semblant d'être sûr(e) de toi.",
      },
      {
        n: 108,
        text: "Donne une opinion que tu gardes généralement pour toi.",
      },
      {
        n: 109,
        text: "Raconte une fois où tu as totalement mal interprété quelqu'un.",
      },
      {
        n: 110,
        text: "Dis quel type de personne t'impressionne secrètement.",
      },
      {
        n: 111,
        text: "Avoue la chose la plus puérile qui peut t'énerver.",
      },
      {
        n: 112,
        text: "Donne ton plus gros red flag personnel.",
      },
      {
        n: 113,
        text: "Donne ton plus gros green flag.",
      },
      {
        n: 114,
        text: "Avoue une chose que tu pensais impossible avant de la vivre.",
      },
      {
        n: 115,
        text: "Raconte une fois où tu as regretté un message.",
      },
      {
        n: 116,
        text: "Donne une habitude de ta personnalité que tu aimerais supprimer.",
      },
      {
        n: 117,
        text: "Dis quelque chose que les gens supposent à tort sur toi.",
      },
      {
        n: 118,
        text: "Avoue une chose que tu as longtemps prétendu aimer.",
      },
      {
        n: 119,
        text: "Raconte une fois où tu as fait semblant de ne pas comprendre.",
      },
      {
        n: 120,
        text: "Dis ce que tu voudrais que les gens osent davantage te demander.",
      },
    ],
  },
  {
    id: "c7",
    emoji: "🟣",
    title: "Duels & compétition",
    adult: false,
    pile: "party",
    cards: [
      {
        n: 121,
        text: "Concours de regard : premier à rire perd.",
      },
      {
        n: 122,
        text: "Faites deviner un souvenir uniquement avec des bruitages.",
      },
      {
        n: 123,
        text: "Dessinez le même objet de mémoire.",
      },
      {
        n: 124,
        text: "Le premier qui utilise un mot interdit perd.",
      },
      {
        n: 125,
        text: "Faites une vente aux enchères fictive de vos qualités.",
      },
      {
        n: 126,
        text: "Chacun écrit trois mensonges crédibles ; l'autre doit trouver le vrai.",
      },
      {
        n: 127,
        text: "Décrivez une personne sans prononcer son nom.",
      },
      {
        n: 128,
        text: "Faites un concours de compliments sans compliment physique.",
      },
      {
        n: 129,
        text: "Chacun invente une règle que l'autre doit intégrer à une conversation.",
      },
      {
        n: 130,
        text: "Battle de mauvaises excuses.",
      },
      {
        n: 131,
        text: "Chacun raconte une histoire de 30 secondes ; vote du groupe.",
      },
      {
        n: 132,
        text: "Concours de grimaces pour faire rire l'autre.",
      },
      {
        n: 133,
        text: "Chacun choisit secrètement un objet à introduire dans une conversation.",
      },
      {
        n: 134,
        text: "Duel d'impro avec le même personnage.",
      },
      {
        n: 135,
        text: "Chacun prédit une action que l'autre fera dans les 15 minutes.",
      },
      {
        n: 136,
        text: "Battle de slogans.",
      },
      {
        n: 137,
        text: "Faites deviner un film avec cinq mots exactement.",
      },
      {
        n: 138,
        text: "Toute hésitation de plus de trois secondes donne un point à l'autre.",
      },
      {
        n: 139,
        text: "Inventez chacun une fausse anecdote sur votre couple.",
      },
      {
        n: 140,
        text: "Duel : qui connaît le mieux l'autre ?",
      },
    ],
  },
  {
    id: "c8",
    emoji: "🌙",
    title: "Mystère & sensoriel",
    adult: false,
    pile: "party",
    cards: [
      {
        n: 141,
        text: "Ferme les yeux et identifie cinq sons.",
      },
      {
        n: 142,
        text: "Identifie trois objets uniquement au toucher.",
      },
      {
        n: 143,
        text: "Fais deviner trois odeurs.",
      },
      {
        n: 144,
        text: "Fais deviner une chanson dans ses cinq premières secondes.",
      },
      {
        n: 145,
        text: "Fais deviner un aliment sans le montrer.",
      },
      {
        n: 146,
        text: "Écris un mot ; l'autre doit le deviner avec trois questions.",
      },
      {
        n: 147,
        text: "Fais deviner une émotion uniquement avec ton visage.",
      },
      {
        n: 148,
        text: "Fais deviner un souvenir avec trois indices.",
      },
      {
        n: 149,
        text: "Choisis trois objets et fais trouver leur point commun.",
      },
      {
        n: 150,
        text: "Crée une mini-chasse au trésor en trois indices.",
      },
      {
        n: 151,
        text: "Cache un objet et donne cinq indices.",
      },
      {
        n: 152,
        text: "Prépare deux enveloppes ; l'autre n'en choisit qu'une.",
      },
      {
        n: 153,
        text: "Prépare un défi facile et un très difficile ; le choix se fait à l'aveugle.",
      },
      {
        n: 154,
        text: "Fais deviner qui a écrit anonymement une phrase.",
      },
      {
        n: 155,
        text: "Écris une prédiction et révèle-la à la fin.",
      },
      {
        n: 156,
        text: "Lance une chanson au hasard et invente son histoire.",
      },
      {
        n: 157,
        text: "Fais deviner ton humeur uniquement avec trois gestes.",
      },
      {
        n: 158,
        text: "Cache un objet façon mini escape game.",
      },
      {
        n: 159,
        text: "Prépare trois enveloppes numérotées ; une seule peut être ouverte.",
      },
      {
        n: 160,
        text: "Crée un coffre-fort verbal avec un code de trois mots.",
      },
    ],
  },
  {
    id: "c9",
    emoji: "❤️",
    title: "Couple / connexion",
    adult: false,
    pile: "couple",
    cards: [
      {
        n: 161,
        text: "Regardez-vous sans parler pendant 60 secondes.",
      },
      {
        n: 162,
        text: "Décris ton partenaire comme si tu venais de le/la remarquer aujourd'hui.",
      },
      {
        n: 163,
        text: "Donne trois détails chez l'autre que tu trouves particulièrement attirants.",
      },
      {
        n: 164,
        text: "Rejouez votre première rencontre avec beaucoup plus d'assurance.",
      },
      {
        n: 165,
        text: "Écrivez chacun la soirée idéale de l'autre.",
      },
      {
        n: 166,
        text: "Faites une photo qui ne ressemble à aucune de vos photos habituelles.",
      },
      {
        n: 167,
        text: "Inventez un code secret pour « viens près de moi ».",
      },
      {
        n: 168,
        text: "Faites un compliment sans utiliser aucun mot de compliment classique.",
      },
      {
        n: 169,
        text: "Faites une danse lente sans musique.",
      },
      {
        n: 170,
        text: "Choisissez une chanson qui correspond à votre tension actuelle.",
      },
      {
        n: 171,
        text: "Chacun décrit une petite chose faite par l'autre qui peut changer instantanément son humeur.",
      },
      {
        n: 172,
        text: "Faites une scène de première rencontre alors que vous êtes déjà ensemble.",
      },
      {
        n: 173,
        text: "Écrivez chacun un message qu'il pourrait envoyer à 2 h du matin.",
      },
      {
        n: 174,
        text: "Concours du regard le plus difficile à soutenir.",
      },
      {
        n: 175,
        text: "Approchez-vous progressivement ; le premier à rire perd.",
      },
      {
        n: 176,
        text: "Complimentez un détail que vous n'aviez jamais osé complimenter.",
      },
      {
        n: 177,
        text: "Faites une bande-annonce de votre prochaine soirée à deux.",
      },
      {
        n: 178,
        text: "Inventez un surnom secret l'un pour l'autre.",
      },
      {
        n: 179,
        text: "Décrivez votre partenaire uniquement avec des métaphores.",
      },
      {
        n: 180,
        text: "Dites ce qui peut vous faire craquer sans aucun contact.",
      },
    ],
  },
  {
    id: "c10",
    emoji: "🔥",
    title: "Flirt & provocation",
    adult: false,
    pile: "couple",
    cards: [
      {
        n: 181,
        text: "Deux minutes sans toucher l'autre : tout passe par les regards et les mots.",
      },
      {
        n: 182,
        text: "Fais un compliment tellement précis qu'il ne pourrait être fait à personne d'autre.",
      },
      {
        n: 183,
        text: "Murmure une phrase inattendue à ton partenaire.",
      },
      {
        n: 184,
        text: "Choisis la tenue de ton partenaire pour votre prochaine soirée.",
      },
      {
        n: 185,
        text: "Décris le rendez-vous qui te ferait le plus craquer.",
      },
      {
        n: 186,
        text: "Envoie un message suggestif à ton partenaire alors qu'il/elle est à côté.",
      },
      {
        n: 187,
        text: "Inventez un code secret pour « je veux te séduire ce soir ».",
      },
      {
        n: 188,
        text: "Jouez deux inconnus qui se remarquent dans un bar.",
      },
      {
        n: 189,
        text: "20 secondes pour convaincre l'autre d'accepter un rendez-vous.",
      },
      {
        n: 190,
        text: "Fais une entrée comme si ton partenaire était ton crush secret.",
      },
      {
        n: 191,
        text: "Choisis une chanson et danse pendant un refrain.",
      },
      {
        n: 192,
        text: "Dis la chose la plus inattendue qui t'attire chez ton partenaire.",
      },
      {
        n: 193,
        text: "Décris une situation banale qui pourrait devenir extrêmement romantique.",
      },
      {
        n: 194,
        text: "Pose à ton partenaire une question à laquelle il/elle n'a probablement jamais répondu.",
      },
      {
        n: 195,
        text: "Fais un regard qui signifie « viens ici » sans parler.",
      },
      {
        n: 196,
        text: "Choisis : mystérieux, élégant ou provocant. L'autre doit jouer le thème.",
      },
      {
        n: 197,
        text: "Écrivez chacun une phrase destinée à rendre l'autre impatient.",
      },
      {
        n: 198,
        text: "Choisis une habitude de ton partenaire que tu trouves beaucoup trop séduisante.",
      },
      {
        n: 199,
        text: "Fais deviner ton niveau d'attirance avec ton expression uniquement.",
      },
      {
        n: 200,
        text: "Invente le prochain défi de flirt que devra relever ton partenaire.",
      },
    ],
  },
  {
    id: "c11",
    emoji: "💋",
    title: "After Dark 18+",
    adult: true,
    pile: "afterdark",
    cards: [
      {
        n: 201,
        text: "Écrivez anonymement chacun une envie que vous aimeriez au moins discuter.",
      },
      {
        n: 202,
        text: "Donnez chacun trois mots décrivant ce qui vous met le plus dans l'ambiance.",
      },
      {
        n: 203,
        text: "Alternez l'initiative pendant cinq minutes chacun.",
      },
      {
        n: 204,
        text: "L'un prépare une surprise de dix minutes ; l'autre ne connaît que le niveau d'intensité.",
      },
      {
        n: 205,
        text: "Faites un massage à tour de rôle avec musique choisie par la personne qui reçoit.",
      },
      {
        n: 206,
        text: "Bandeau sur les yeux : identifier différentes textures non intimes.",
      },
      {
        n: 207,
        text: "Choisissez chacun une sensation que vous aimeriez découvrir davantage.",
      },
      {
        n: 208,
        text: "Faites une dégustation mystérieuse les yeux bandés.",
      },
      {
        n: 209,
        text: "Inventez chacun un scénario romantique fictif ; l'autre choisit son préféré.",
      },
      {
        n: 210,
        text: "Faites un « oui / peut-être / non » avec dix nouvelles idées de couple.",
      },
      {
        n: 211,
        text: "Expliquez chacun quelque chose qui vous attire particulièrement chez l'autre.",
      },
      {
        n: 212,
        text: "Faites une playlist de cinq morceaux pour une soirée intime.",
      },
      {
        n: 213,
        text: "Posez chacun une question intime jamais posée auparavant.",
      },
      {
        n: 214,
        text: "Jouez deux inconnus qui se séduisent sans se toucher.",
      },
      {
        n: 215,
        text: "Pendant cinq minutes, seul celui/celle qui reçoit peut décider du rythme.",
      },
      {
        n: 216,
        text: "Inversez ensuite complètement les rôles.",
      },
      {
        n: 217,
        text: "Choisissez chacun un look inhabituel que l'autre doit découvrir.",
      },
      {
        n: 218,
        text: "Faites une enchère de vos idées de soirée les plus audacieuses.",
      },
      {
        n: 219,
        text: "Révélez une chose qui vous attire énormément chez l'autre mais qu'il/elle ne soupçonne probablement pas.",
      },
      {
        n: 220,
        text: "Chacun écrit une proposition pour une prochaine soirée ; réponse : OUI / PEUT-ÊTRE / NON.",
      },
    ],
  },
  {
    id: "positions",
    emoji: "🔥",
    title: "Positions à tester",
    adult: true,
    pile: "afterdark",
    cards: [
      {
        n: 221,
        title: "Pretzel Dip",
        text: "variante latérale avec une configuration des jambes inhabituelle.",
        group: "Niveau A — Moins classique",
      },
      {
        n: 222,
        title: "Face-Off",
        text: "version assise face à face, idéale sur un canapé ou au bord d'un lit.",
        group: "Niveau A — Moins classique",
      },
      {
        n: 223,
        title: "Spider",
        text: "configuration face à face inclinée avec les jambes disposées différemment d'une position classique.",
        group: "Niveau A — Moins classique",
      },
      {
        n: 224,
        title: "Magic Mountain",
        text: "variante inclinée qui change nettement l'orientation habituelle.",
        group: "Niveau A — Moins classique",
      },
      {
        n: 225,
        title: "Cross-Buttocks",
        text: "configuration transversale qui crée une géométrie différente entre les deux corps.",
        group: "Niveau A — Moins classique",
      },
      {
        n: 226,
        title: "Reverse Scoop",
        text: "variante sur le côté qui change l'orientation d'une position type cuillère.",
        group: "Niveau A — Moins classique",
      },
      {
        n: 227,
        title: "Lazy Man",
        text: "version davantage soutenue et semi-allongée.",
        group: "Niveau A — Moins classique",
      },
      {
        n: 228,
        title: "CAT",
        text: "variante du face-à-face basée sur un alignement différent du bassin.",
        group: "Niveau A — Moins classique",
      },
      {
        n: 229,
        title: "G-Whiz",
        text: "variante du face-à-face avec les jambes positionnées différemment.",
        group: "Niveau A — Moins classique",
      },
      {
        n: 230,
        title: "Lifted Missionary",
        text: "variante où un coussin modifie légèrement la hauteur et l'angle.",
        group: "Niveau A — Moins classique",
      },
      {
        n: 231,
        title: "Standing Lotus",
        text: "un partenaire est assis et l'autre debout face à lui/elle.",
        group: "Niveau B — Canapé / assis / bord du lit",
      },
      {
        n: 232,
        title: "Seated Wheelbarrow",
        text: "adaptation assise d'une position de type wheelbarrow, avec davantage de support.",
        group: "Niveau B — Canapé / assis / bord du lit",
      },
      {
        n: 233,
        title: "Chair Reverse Rider",
        text: "variante assise inversée.",
        group: "Niveau B — Canapé / assis / bord du lit",
      },
      {
        n: 234,
        title: "Seated Face-Off",
        text: "position assise très rapprochée avec contact visuel.",
        group: "Niveau B — Canapé / assis / bord du lit",
      },
      {
        n: 235,
        title: "Edge-of-Bed",
        text: "configuration autour du bord du lit, permettant de modifier facilement les angles.",
        group: "Niveau B — Canapé / assis / bord du lit",
      },
      {
        n: 236,
        title: "Couch Lean-Back",
        text: "variante soutenue utilisant le dossier d'un canapé.",
        group: "Niveau B — Canapé / assis / bord du lit",
      },
      {
        n: 237,
        title: "Seated Side Angle",
        text: "variante assise latérale permettant de jouer sur l'orientation.",
        group: "Niveau B — Canapé / assis / bord du lit",
      },
      {
        n: 238,
        title: "Supported Rider",
        text: "variante du dessus utilisant un dossier ou un support stable pour davantage de confort.",
        group: "Niveau B — Canapé / assis / bord du lit",
      },
      {
        n: 239,
        title: "Pretzel",
        text: "variante latérale plus marquée du Pretzel Dip.",
        group: "Niveau C — Plus technique",
      },
      {
        n: 240,
        title: "Leapfrog",
        text: "variante plus inclinée d'une position arrière.",
        group: "Niveau C — Plus technique",
      },
      {
        n: 241,
        title: "Pillow Angle",
        text: "prenez une position habituelle et utilisez un coussin pour modifier uniquement l'angle.",
        group: "Niveau C — Plus technique",
      },
      {
        n: 242,
        title: "Cross Angle",
        text: "changez l'orientation du bassin sans changer complètement la position.",
        group: "Niveau C — Plus technique",
      },
      {
        n: 243,
        title: "Reverse Rider",
        text: "variante inversée d'une position du dessus.",
        group: "Niveau C — Plus technique",
      },
      {
        n: 244,
        title: "CAT inversé",
        text: "expérimentez une orientation différente à partir du principe du CAT.",
        group: "Niveau C — Plus technique",
      },
      {
        n: 245,
        title: "Side Twist",
        text: "variante sur le côté avec une orientation différente des jambes.",
        group: "Niveau C — Plus technique",
      },
      {
        n: 246,
        title: "Kneeling Angle",
        text: "variante à genoux avec différents appuis et inclinaisons.",
        group: "Niveau C — Plus technique",
      },
      {
        n: 247,
        title: "Lazy Wheelbarrow",
        text: "version plus soutenue et accessible du wheelbarrow.",
        group: "Niveau D — Très physique",
      },
      {
        n: 248,
        title: "Seated Wheelbarrow avancé",
        text: "même principe avec moins de soutien.",
        group: "Niveau D — Très physique",
      },
      {
        n: 249,
        title: "Three-Legged Stand",
        text: "variante debout demandant équilibre et coordination.",
        group: "Niveau D — Très physique",
      },
      {
        n: 250,
        title: "Standing Wheelbarrow",
        text: "variante très physique nécessitant un appui extrêmement stable.",
        group: "Niveau D — Très physique",
      },
    ],
  },
  {
    id: "modifiers",
    emoji: "🎲",
    title: "Cartes modificateurs",
    adult: true,
    pile: "afterdark",
    cards: [
      {
        n: 251,
        title: "ANGLE",
        text: "gardez la position mais cherchez un angle différent.",
      },
      {
        n: 252,
        title: "LENT",
        text: "gardez la position et ralentissez complètement.",
      },
      {
        n: 253,
        title: "REGARD",
        text: "priorité au contact visuel.",
      },
      {
        n: 254,
        title: "SILENCE",
        text: "aucun mot pendant toute la durée du défi.",
      },
      {
        n: 255,
        title: "GUIDÉ",
        text: "une personne guide l'autre verbalement.",
      },
      {
        n: 256,
        title: "INVERSÉ",
        text: "essayez une variante inversée lorsque c'est possible.",
      },
      {
        n: 257,
        title: "COUSSIN",
        text: "ajoutez un coussin pour tester une nouvelle hauteur.",
      },
      {
        n: 258,
        title: "SURPRISE",
        text: "chacun choisit secrètement une position et le hasard décide.",
      },
      {
        n: 259,
        title: "COMBO",
        text: "choisissez deux positions et trouvez une transition confortable.",
      },
      {
        n: 260,
        title: "INVENTEZ-LA",
        text: "prenez une position connue et modifiez un seul paramètre pour créer votre propre variante.",
      },
    ],
  },
  {
    id: "special",
    emoji: "🏆",
    title: "Cartes spéciales",
    adult: false,
    pile: "special",
    cards: [
      {
        n: 261,
        title: "DOUBLE OU RIEN",
        text: "si tu réussis, deux points ; si tu refuses, aucun point.",
      },
      {
        n: 262,
        title: "MIROIR",
        text: "ton partenaire doit faire exactement le même défi.",
      },
      {
        n: 263,
        title: "INVERSE",
        text: "ton partenaire choisit la manière dont tu réalises le défi.",
      },
      {
        n: 264,
        title: "SILENCE TOTAL",
        text: "interdiction de parler pendant le défi.",
      },
      {
        n: 265,
        title: "CHRONO",
        text: "20 secondes pour commencer.",
      },
      {
        n: 266,
        title: "MYSTÈRE",
        text: "choisis A, B ou C sans savoir lequel est le plus difficile.",
      },
      {
        n: 267,
        title: "VOL",
        text: "vole le défi d'un autre joueur.",
      },
      {
        n: 268,
        title: "RETOUR",
        text: "renvoie ton défi à celui/celle qui te l'a donné.",
      },
      {
        n: 269,
        title: "ESCALADE",
        text: "si tu réussis, tu dois jouer une carte d'un niveau supérieur.",
      },
      {
        n: 270,
        title: "BOSS FINAL",
        text: "choisis librement une carte encore jamais jouée parmi toute la liste.",
      },
    ],
  },
];

#!/usr/bin/env python3
# mtg-table — tools/atlas: the pilot's check that a night's deck draws are the recorded ones and new.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""The pilot's deck-draw check: the night's spine and validation draws (tools/cubelab.sh decks) agree with a
second draw at the same seeds, are new (none is an earlier night's, by sha256), and match what the pilot recorded.

    ATLAS_DATA=<night data folder> python3 -I tools/atlas/draws.py [--record | --report]

READS $ATLAS_DATA/decks/, $ATLAS_DATA/validation/ and $ATLAS_LOCAL/redraw/ (ATLAS_LOCAL defaults to
var/lab-j193-local). --record WRITES $ATLAS_LOCAL/draws-pilot.json once, when it is absent and every check holds;
otherwise one JSON object to stdout. The seeds and the earlier nights' digests are J193's. Standard library only.

Moved into the repository from the lab's J193 job file (D515): byte for byte but for the two folders, which were
paths on the lab machine and are now $ATLAS_DATA and $ATLAS_LOCAL. The comment block below is the job's.
"""
# J193 (drafts/J193-atlas-4b-night-fifteen.md): J177's draws.py for J193's seeds and folder: the draws made by J193's pilot into the
# NEW data folder lab-j193 (D447 with D482's list as D490, D492, D494 and D506 leave it, at the pin, deck seeds 3685-3697 and 3885-3897) and
# again into the clone (var/lab-j193-local/redraw/); recorded once into var/lab-j193-local/draws-pilot.json. One addition: J177's 13
# spine draws and its validation draw are registered beside J171's and J173's (J177_DRAWS, J177_VALIDATION, from J177's own
# var/lab-j177-local/draws-pilot.json in the lab clone, read on 2026-10-31), J180's and J181's beside them (J180_DRAWS, J180_VALIDATION,
# J181_DRAWS, J181_VALIDATION, from their report/draws.json, read on 2026-11-01), J182's (J182_DRAWS, J182_VALIDATION, from
# lab-j182/report/draws.json, read on 2026-11-02), J183's (J183_DRAWS, J183_VALIDATION, from lab-j183/report/draws.json, read on
# 2026-11-02), J185's (J185_DRAWS, J185_VALIDATION, from lab-j185/report/draws.json, read on 2026-11-03), J186's (J186_DRAWS,
# J186_VALIDATION, from J186's var/lab-j186-local/draws-pilot.json in the lab clone, equal to lab-j186's draw as derive-j187.py
# recomputed it, read on 2026-11-03: J186's Report never ran), J187's (J187_DRAWS, J187_VALIDATION, from lab-j187/report/draws.json's
# `asRun`, equal to its `recorded` and to lab-j187's draw as derive-j188.py recomputed it, read on 2026-11-04), J188's (J188_DRAWS,
# J188_VALIDATION, from lab-j188/report/draws.json's `asRun`, equal to its `recorded` and to lab-j188's draw as derive-j190.py recomputed
# it, read on 2026-11-04), J190's (J190_DRAWS, J190_VALIDATION, from lab-j190/report/draws.json's `asRun`, equal to its `recorded` and
# to lab-j190's draw as derive-j191.py recomputed it, read on 2026-11-04) and J191's (J191_DRAWS, J191_VALIDATION, from
# lab-j191/report/draws.json's `asRun`, equal to its `recorded` and to lab-j191's draw as derive-j193.py recomputed it, read on
# 2026-11-05): none may come back here.
# J177's header, unchanged below:
# J177 (drafts/J177-atlas-4b-night-three.md): J173's draws.py for J177's seeds. The deck draws, made by J177's pilot into the NEW data
# folder lab-j177 (D447 with D482's list, at the pin, deck seeds 2040-2052 and 2240-2252) and again into the clone (var/lab-j177-local/redraw/,
# J167's redraw). These seeds were never drawn before, so no spine's sha256 is registered: the two draws must agree deck for deck, the smoke's
# pair (deck seed 2099) must be J166's registered sha256, and no spine draw may be one of J171's 13 or J173's 13, nor the validation draw
# J171's or J173's (registered below: a guard against an unshifted seed). The pilot then
# RECORDS the sha256s once (--record), and every spine block checks its decks against that record (deckcheck.py). From files only (no engine).
#   draws.py            one JSON object of numbers (the pilot's `draws` metric reads it from draws.json)
#   draws.py --record   writes var/lab-j177-local/draws-pilot.json when it is absent and every check of agreement holds; never overwrites
#   draws.py --report   the sha256s as run and as recorded (report/draws.json)
import glob, hashlib, json, os, sys
D = os.environ.get('ATLAS_DATA') or sys.exit('draws.py: name the night\'s data folder in ATLAS_DATA')
L = os.environ.get('ATLAS_LOCAL', 'var/lab-j193-local')
R = L + '/redraw'
REC = L + '/draws-pilot.json'
BANDS = ['pauper', 'peasant', 'legacy', 'powered'] * 3 + ['pauper']
SP = ['s%02d-%s-%d' % (k, BANDS[k - 1], 3684 + k) for k in range(1, 14)]
VA = ['v%02d-%s-%d' % (k, BANDS[k - 1], 3884 + k) for k in range(1, 14)]
REG_SMOKE = 'edfdc861736fb049bc1080d525269064c6776ecabd47de496463fa3dc684c931 2'
# J171's 13 spine draws (drafts/J171-atlas-4b-card-targets.md, draws.py's DECKS) and its validation draw: none may come back here
J171_DRAWS = {'a40fb5addec594bd6e97b0e7b16d78af1f08280dcc555366b3a2301feda4ff34', '86ccaaf3b3ba6f5959aacf073a9dc0465aadf1a9d02ddac8eac695091eaea576',
              '0e9d8c744abd6eff72d2fc1cca4003c7cecfdb85830c077d8c29e16891bfacc1', '81c4dd22dcdbd1a110b0339476cbab04e8f6d2791f1881e42499b97f8675dc00',
              'afc7ce320e966d96e5c92ec9d28c357e6f603c59927f677549ce261227b1b92e', '191a5d8aac5d516f5472f0a01a0cacf660a9fa931e70b806a42723e4dfba161f',
              '5287d2666529b6dd35ec4a271a1b71c5b01d8096bcf1c3acd114945c7a435636', 'd653b4cf2bf2d94649449caaf174d21453cd34b58972c3e22ea8e26dacf75f71',
              '1216932fb9807608a5bf859ac768e12efa40c031fc685f16b56b274a2bbf7601', 'e4676bda05d0204f3ce43e3f8d1ee1a0ca0c8e24c7f8cf09860423d00ddedd9b',
              '4ca069ba7bdae91d218e589a41c28da836c7544da53577d14c5994aa64ca8642', '5d49d21add4ba8cc269babde10dc63c7b7885e94b1df7437d217e02bd2db820d',
              '6f20b45b168bf6ba0e365bf27e507e31c431eb76c6f389336cfc8db3e3752591'}
J171_VALIDATION = '7def89fa82af9e14ef82042df0162a23e458c3a3d7a34fd8fb889dfa4cb117de'
# J173's 13 spine draws and its validation draw (lab-j173/decks and validation as this draft read them, 2026-10-27, equal to J173's
# var/lab-j173-local/draws-pilot.json): none may come back here either
J173_DRAWS = {'bda23027e30bfa785eb8800a59c13598c652bae8a32b5dfa6f72554675726ef2', 'a2cad311341fa662eaa0720286386e169b06eeb8270e8880a0f910d86b901646',
              '1009922ed3a4e306172d66c2e0808622464e16dcb7d8832b767623d8ec00a2bb', '6611f1104b84e8616449628d548e2caf764978a9881a0093e83e3424e6bee350',
              'bdaf4cdc41cb5b91c18b5f050e482949a7835694cc1e752e351c44aae6faeac5', '43d09352be81da6e0173079c35773d4ce23bc8490b9d4313351644fc80a5f150',
              '1b65977550215bded3baaa8349ba42281eb4f2d9e4c898c3ff36f4b5bbf2395e', '5c63e8e936bb1e0fb35aa12cb204088b51937c78655fabb5a57f4eb5709d852a',
              '3abe41cb921d801ca19c360fd02fb15c0a72332eae730f6d1525d639c96ec356', 'f70e76d1e77bf1d0d9675e854772b32709d115645959459d8a5cb14e4f5c615b',
              '6e54962a5e5f58e3b693f850879998fa37b6a863a4a416caaa1c2c79286879f4', '491a0e3a45844c784927cb120003115bb16eb2b0fd67b090322a916523b56b16',
              '45ddf51d3e764483d277f259f92e8a95127aa414872464709adb08fb510067d0'}
J173_VALIDATION = '2d8fc399fb267eb70b060f984d573843b8f5801976f69b38b6eb8f80810fae19'
# J177's 13 spine draws and its validation draw (J177's var/lab-j177-local/draws-pilot.json in the lab clone, as this draft read it on
# 2026-10-31, equal to lab-j177/report/draws.json's validation): none may come back here either
J177_DRAWS = {'9cb6954a1a2018613ef7a88d5406039f89014bcd7273644e9341c221e762d140', '9ee08a04d59d4cef9575fe61feb7526bb36c166a2a338ef3cda26dd5eb0a7d96',
              'a3c90f5f2f6daf5679edafb6f3bb5b0d68f0821fb5c8d90a4c7e4599a602c339', '2fe29b964b322dd121743f9269fba6443d1feb954f2d7adbbff2b36bce0e2eee',
              'f2fa7ce57d7fdb4044cd56e791c83fe783e5df1074658504376f53a4b036bb39', '7125dd10bc0e5c487cd9b342ae4aa932ea26b589866795908b2348ac4fea6589',
              '24afdee34caf8b20654e283685351bab754add41daff38d4f4ce15de67cf9db0', 'b81a1c8fbec01f102829e96fa1da431786bcba37f67d07c2e0fb549baf4d2c51',
              'dc50ecef44efc6bdad0354859a2e0ae5fcace5dcb342842e9d28f94d4d1145c0', '24ab94f77162760ca0be8cac3757332de5ac12b00c89a0750548433162e157a0',
              'dfc6b8a063e8b8271532f8a169ee7b58584ef3ce06bba0025d9ab1a030f1deea', '282e9cf4eaa716c9145b4e44e89692c72333a74b6ef8c74003e14c29d902ab0c',
              '1e6542665dadbc979388dfef4f156b8c02f16ea56166a360638304948e39836c'}
J177_VALIDATION = 'a892900b017e630a517fee6f98e455da36136c30ebd35690d71b1177410d8238'
# J180's 13 spine draws and its validation draw (lab-j180/report/draws.json's `recorded`, read by this draft on 2026-11-01): none may
# come back here either
J180_DRAWS = {'bc0921398ede73fec554271ccd54e7b1f6a801a4b7c407e454db8920ef64cb6f', '0fbfbc5e817ee0b5b56426078bb3b3c03468c510c824576654d975c43cdfea44',
              '302e3cc3389ee1d11b8d23fd173353d70b381ffb4d2b3c0aca9e59056b2b3b4c', 'ff1de9c3f8e0479070c9f0d50e828625648cdf2e57996649251d86d1720c534f',
              '7ffffda6fb658c10acdaa99154a4caae3d951f48206a111e4d304b9f7f8832a5', 'f1e9a5ccd84a7728d94b88a9c309fa398e0404692344b6ec5986e454d44e7cfc',
              '3e6b25e220b7edeb91f41b32529497750fbf58c596fc69e64b1e33953e2d842d', 'b6773207b60dec3ae6b3177d3a416260598319819f82e813cf81c6a8025a7de0',
              'f93ad6ee71ed52cb19ce07683288361dde93db552e50feba7f7e233b65965512', 'f3c093f82e8448cfc9490f51345121a84a4197bb712e13054775450bc39579d1',
              '5058cef2f48aa118e5a7963fe26573b2221d3c2afcff057d241c17a2d3ab130a', 'bebbe76188cfbb6768b1c9ecb0b009c65d709a7d42a0b9e415af4bebe02fabc2',
              '56cce468cfdf43d309f70aa4004e5c303a578e2b2fabee9b61c673893b9f8b24'}
J180_VALIDATION = '39eb160cd3c862914b8c263837678e12f3f47cd83a364e1c4a493d15306192bc'
# J181's 13 spine draws and its validation draw (lab-j181/report/draws.json's `asRun`, read by this draft on 2026-11-01): none may
# come back here either
J181_DRAWS = {'670dd90b817d7dfddc1e57b02d1f81da091f2cc6cf1e8f7da134186f7bc6ed2d', 'e151788b468ca9b8dffe9fb4492c82b45e6197c6c816b204064119d68f82b123',
              '275f71739cf43909b87eb88e8c095b8bc5eb02a467b948338fadf8e1ec1793ab', 'f025c63a3bbaa4b0497eff78517c63622b5067bc45fec4c999898905e288425b',
              '7b2a8b638866a605cd6a9dbbe7830a9076e6d4ea6ce22899ca282c7e9324bedb', 'a2e3e46b5db0826aa0925da5feea3fa4659c9c5419664664151b1f73c515193b',
              '3a2202e6883bf4968f3ff887ca7f89d216f4439cc8b926ad0f884dce39da1dfa', 'f0330e5e87a0e6518f47acca3d30dd40baa6923832a3063b1e0cb82d3f45044a',
              '33d0b5deb46dabcbcf7ddeb4233465a8e155f667f42b1fa1da8a09dc745061f9', 'c87048e84d7e7a14f21b6f8d697d4586ddc1f5825ebb941a7ca160fc427d56de',
              '9a9297c3936e57053716a38fb614af6918f25f7752681ab4ab6729201c810bce', 'c75c6407d2bfcd9a5ab9bc6173131ee4b5abe1b4e1f76429610d3adc27c2846e',
              '7c6e319abef8bd288115b3d783e5a6496bb2855aa8ae9d14e3c3857a70df13f1'}
J181_VALIDATION = '16cb39e8444faedf49f38e68758a3f37e47862037247cefa8b40989b78386a40'
# J182's 13 spine draws and its validation draw (lab-j182/report/draws.json's `asRun`, equal to its `recorded`, read by this draft on
# 2026-11-02): none may come back here either
J182_DRAWS = {'e187593bab46727e2680eb448619e4f6167b8c809afde10d46a41a55cac60b0e', 'bb1e163818ca148a86449ecbfd7f2fa890f27a1e85eff9ec2b7f958bfd4e57fa',
              '62dbba0133ccff2aaa25012e78bfcfce8b2033ccdb8de9ebb8f13af78da206fa', '789be12e7e2caf26c505f06f82273c213eca48f98ca8b21fcbf05b43d0cf4ea1',
              'cbbad5a90f92cc096467e1a4b398dc32f0aefe08eb54bc09d59e28d0c0227969', '72319dd938da84dbcd81938abd453526f5e49ff123c2f1027d5720ef6f3da9e4',
              'c3041197893399af7d67de773b199068475bcfce8ba3603f62ecc6af23e752d0', 'f7fa57e80da173972ede8aa2881d586790fbea16c757ff9850c9c758aa1bd804',
              'f66b943bd1545ab3e2921ccb66cc8c65e88cc1cf9de5511f49a412611dd4864e', '7d97e0ebe981e5c408edb9eb90fb812dd46cd5696074d36ee9c596fd7e8acedf',
              '559f60c33fa20176b87d9af13041b6466a05ea9c1948ec62478358b5fc70802c', '9fec8825211657c02f180ef177a7e17d4f5bac64283f5a32bc16d3706784f8b7',
              '6034ec2cdea2b0e45f5b8f3b4ea47c6b95b3f7e113731a629bc9a17355ad79b5'}
J182_VALIDATION = '6f6599c3a74b209bfc4c44de51a3a022d4d9aadcfe5fe37559154d86ac19fda2'
# J183's 13 spine draws and its validation draw (lab-j183/report/draws.json's `asRun`, equal to its `recorded`, read by derive-j185.py
# on 2026-11-02): none may come back here either
J183_DRAWS = {'0b06cd16408c3b42504d8eea382223a17a55bf8355d97000119e1ad35cffd5c5', '0b207d3c70267cdcdd6c92806e8e86e8b18cf071af4c456d35d812cd470a70d9',
              '1859a75d8e44c30e574dd7c6092ce40d772700eb7cf999bd0a0e54ba05665ef3', '22c95d011ea74606e51f8ad62145e9e75e7d69a200f3520ecaa575b59e929d8c',
              '22eb389d871ea57111cff54b6ad89d49cc654a7672cf9a52e04149db5cf4bfd6', '2ce89da5487ab50f763d12443bf102c2ad46311d1c770591faa370809fe141c7',
              '4211adcbdad071843da5a07cf231ea435ad1c127ee4f178aa20b4f1470799a55', '90833949012d81c2153152cafde969b11cc81a58bcf49ce23b83282eda78f399',
              '9512c267e36029189c6e03b36616976932a957fa19f9bacfe07039984e87d075', 'a4d87b9a535059d476476ea602adffd4a07a29ee21c0fa9a2077a225c472940e',
              'aadb630bcb155ff40e487d40162cd2de27d0d269c5057f769befc4dc5a7b32c6', 'c4f00052dd3aa83249d599c5495caac07dd13d9a9ca28716ff5e60bf37302b87',
              'cc8cb0f0f97a1b50b9d110f3c4d7894d0c2012e26a99459b883348c352b3014d'}
J183_VALIDATION = '6184c7e83711bc3c1b772542447f80c085d7a06f85fda5747f146e339b2d9fec'
# J185's 13 spine draws and its validation draw (lab-j185/report/draws.json's `asRun`, equal to its `recorded`, read by derive-j186.py
# on 2026-11-03): none may come back here either
J185_DRAWS = {'03a4975dc4cd2a383212fc59a2243633123547cf1da851fca5c304f9211e2c23', '042a1a8ec2c74ec025f2253fee9c5e33e765243a1245110c036a192b58a00920',
              '18e875b992b2a29e50570509ca0375329688e8393e0a2f0238defe7773e05f06', '299412fa8197144a25d2b8762e39f87348f0dec9262ecb5c0ac0b67c9cc1fdfc',
              '8462a35f594cf727a977b5589bfbb4266ac8824474b0d424fa55aa0529910df4', '9109654621721123028b27e64dea4183db245b15734da579867f697e64419e5d',
              'a65121c5338cec0f25109cef0e011fd0e241ac474070b3cfaa4bb7d739da9673', 'a6c0f46fbb0c80a66977904d406283ee601eef5ba8c9a5a4dbfa3c0c200e4a1e',
              'aafdd510e1bf29137b46c5750a614eab5c2639e26041f8bf8d45630bd9d9d254', 'be65364483a3d4302c55162d77e78f5fa50d41d15775f50b433895ab4a32d5c9',
              'd152b13dac9a678daf0193b99d2e2edf8472f5549fbcc100d5616a2671206375', 'd2668cfe24891c184934bbfd55efeec216567e765fc9ca92c5a61c8d03d0cd32',
              'dad6b62d9e968ccf7d8cc93546dc6473bd6adbc77ef2888ce48088c030262e26'}
J185_VALIDATION = '85358de6d18896ae622062228cf623bd49c97beb5551096b7927124983ea0a87'
# J186's 13 spine draws and its validation draw (J186's var/lab-j186-local/draws-pilot.json in the lab clone, equal to lab-j186's draw
# as derive-j187.py recomputed it on 2026-11-03; J186's Report never ran, so there is no lab-j186/report/draws.json): none may come
# back here either
J186_DRAWS = {'0cc0ef0e853e36b236d91623d0b1714042607bd7872d1bad171fced840e4fc84', '1ac7d548c2b19dea7d9d8133a73fdb785ec7999e93fee3a7d5e08c30f64e10ef',
              '21275b616616257f2cfc601ab212d0d9cdc2c632291a0a90540a7f863358f75f', '2a3cc7331ff24c11d62c5bd61a4aadfbc04f6623f1687b8230684363396ebdaa',
              '2b020e3dd4f5843e18def701f43833bf7a1ae511b20850178c812074f364025a', '390f882fdb2ec425246af3d5d6190a58788677fbdb1b34deb61510b8ac2541a1',
              '475a897d33b33d5ffb46e2975e2da94998838cedc83b2fee626f5ad52b096132', '7935195256566d941a1f06956f2278e050f30e481020cd5fcd881dd50e8c3167',
              'a050fc37e11f83ce4e18c4abe9be65d9cfb00f020f31613e5083f67be69e5614', 'a0637518dff3f9bda5a9fff0b0361c85b4650825a0ef93741a4a12dc9643c144',
              'b9a2dcd70454e0414a35fc8ca56a50743d47c4f48347fb65c5dd727872d841c1', 'cec37315dffceaf56c1c9a10741b25372561e110254383aeef489204373ccacf',
              'e24731d3bc8a55d11f8d5f22f91ab4e31bb97f02a3d68fdf83f630ad93b36adb'}
J186_VALIDATION = 'b1e9f113c3bf425a06d64435cb3a2b65dd99101ca3601679b2fd04ab9eaa50e6'
# J187's 13 spine draws and its validation draw (lab-j187/report/draws.json's `asRun`, equal to its `recorded` and to lab-j187's draw
# as derive-j188.py recomputed it on 2026-11-04): none may come back here either
J187_DRAWS = {'07bb1a2569a3af5a90cb8dced67994152d42ecbc1a482aa9fad6d52a24a6254c', '49d28e15b058953a4a752539d75f3fd8dc03ddc4499fbdb5a6b29ae452bef9d3',
              '56cfed2c594be8766f766e4c96c602f8f29570a3e29cad04acc58c496dcfbeab', '58d776b8288582c36841909dc4e51921b8ee9087be6e5b72a1d2dea89d6363c0',
              '69764ce5e63fcfde8a2aba8d9814f025b17d23b9d1f4910ae381ea9a66a16d1d', '6cff59a648bd59d6c898911324e6042330daa325cc3ae405a9d1c2fd465daaf0',
              '91b3d1bd0999b03e06977fa2e4b09e56debc0eabe024f2dc366ba46ee0c12373', '9fd520a255383593143ff55ed5ade7f332f4a0ede7c7ffca47a645cd1930b82c',
              'aa539c0689f83eff2e5d61b549066116e060e0b738e3d8c5df504378c68086c3', 'ab2258fd19e2bd886ccdbca64cd4eff927305b1cf588940b8225ef8539f96ff0',
              'b4909a7bc3e52ce8257720fd24b7c490d513691423f13d9d49ea46676e7e9f4d', 'ce3b5c84ccde23af2d548bf15930f6d39e5861f0824bcc94c7e7dc31d214fd8b',
              'ded3109187459c7744cea6ade1719af0b222d830d5ed0fd4a1758a942f706679'}
J187_VALIDATION = '8dcafaf3451ebacc49b5af180ec5846cd1526b2ea9d789e1672fe1756460e6df'
# J188's 13 spine draws and its validation draw (lab-j188/report/draws.json's `asRun`, equal to its `recorded` and to lab-j188's draw
# as derive-j190.py recomputed it on 2026-11-04): none may come back here either
J188_DRAWS = {'081af7bce55cf2bf351f292d2cef4510448a7df834bacbb4af68651675fa651a', '081b31a7dba0a372c00a2505a47e76d3167f43ca7dbcce2e11b94ec07073c21b',
              '08d7a1fcc38c96718eff9cfd1c6298cb0d84e86041fa4cbc2b6edc6c29ba7c80', '32345e0ecf6650493d2e081034c69a01f41e20cbe2002b2b71f860b3f4a56140',
              '5d2c0203f31bf52d6f645c55ae12b9eb3511e629983a630e462dc99eb0ceb6ce', '6c1b54983dc2db057c53ac442292e45f5e9a3eeae27dd6187420d99208134cbd',
              '7743785c860304264e669480959f5ffb943f8d4c08287865a5199e7dab728732', '7e4beeaa3782ea1d59182b013cbd482e75d5e9ce27df00f2915f6fa0ec219542',
              '939904df5354315f7efc420f083d080425fc0d243ef8124411b7c0c564465962', 'c4da849f422f5c24425678a39e781ee7d4949cbf14f060c2b486a0592fcf7d11',
              'da856ac5e3acf0dd90c7dbaf0e58880799b12e9397487d1ef93d3a99810d866c', 'eece8260932172f79e77105f18084430eb0d9f15b624aa2f6ab28a39c2e9a513',
              'f9e7965d1741b99c21c2d9b4d5ac7a0aa56ab5171739682139d03c5d8c2df83a'}
J188_VALIDATION = 'd988eec2781c1e5c409b1303c0675f43b0212656b5febd27403a0f1bca306fa8'
# J190's 13 spine draws and its validation draw (lab-j190/report/draws.json's `asRun`, equal to its `recorded` and to lab-j190's draw
# as derive-j191.py recomputed it on 2026-11-04): none may come back here either
J190_DRAWS = {'0040c8004db0e430f7f72b4f413ef9e99dfc3464c6f1c331d0d34086eacf091a', '037f69f60f3059cc82cab3fdc0de3affa9b614fc60459583813afbf9092da47b',
              '40f6e0f500dc9d774064b58e163115f86801e2a11f5647d1a95211ab01da18b6', '5463ed0fb7c8ed78b90a6f358ffa5d39e8ad9158a1f56c18d606911c32f0d004',
              '653acfb1180cda3e783c528ac8ec33f8f4cf56144a573ea3e28b2704630ce8bd', '91481dbf623a7e8aadd5205f4a38473772abb6859eff8c135f966d4830abe95f',
              'b05f71587a56819b29cca57552e2f4ccd7f5c53c56a25e883afedd2caffa9880', 'b652ffde981eaf24f9481f6b31eb7b52972839578b0ef9fdae603990ef5fc021',
              'c3a45a9240d4ad86472949fd2067114a53235ab7e240b7fdbf27f8afdd5f42a0', 'dd36eef9e782309534e892f662393179ccb38637294166accbaa9cbff383616b',
              'dd767b4b8f4154b054f519a32c64f5c2e522a6f62f1555978d186afc62845177', 'f91584000ba2f86d1b9154d3a788b122595ddc13f65f7fe6aacbdfefc1a4086d',
              'fcf3e3c7ef9f18069b261f29e1c4ffcee2ac9fee074dab6b0286e237d2942bba'}
J190_VALIDATION = 'b7c9098a1af2bdb4c7d488caf537a74193f00ed3521deab844edb9abbe61cc02'
# J191's 13 spine draws and its validation draw (lab-j191/report/draws.json's `asRun`, equal to its `recorded` and to lab-j191's draw
# as derive-j193.py recomputed it on 2026-11-05): none may come back here either
J191_DRAWS = {'108a8e2ac9dac6242f307da66042f2beba859bd620fe3d238fd2ad1edfee2f2e', '3e01dca03e9aaa0bcd36118fc4dde23a38ee37164560b2957833e01a1826a940',
              '4cba8d1ce2513b20ec85aeea98aa1cf2135fca1241901529575bcd2ec89c34b3', '4f622e518526ade0770aab74337a397be6d9b96dffd487d64394f3385ddff90b',
              '53aa9038f0e9903d6d4bd27c31723f55ac1622fad3411aa3bc524c5f3e2091ba', '631184deb248e523c96ec6654bd4c0f79186bdda17e3a9cfb53f2052f5fed96b',
              '63e2a2a4ae1b0c8e41079990202dfcda6aa2ab6d02afae253f1e0ec27afd91c9', '6dd08bd36fa9aea037dd9eb94a4ec72558bca6268b334505764e1432578827b9',
              '879c3e3666a3275dfa476862142fa0c32982a6205daa7a7b5c3450f8c840ed85', 'a0ae71b9aaa96c42ce944b31b0c8e1c6c91e1a4d69e943f1d8b433a53d26fe41',
              'b3849f29f10da4cadc1dd7737e87b209d8c7b82ce6ce7cdcc8d0f4154d724f85', 'ce7345f6d835bd963fa6b79c0deeff2558f14fa906ff35c6d1e8b998f8717389',
              'db81e206f2df260c380718dbe33edc538d13c73ba5f1da1a525e7cda16e011a8'}
J191_VALIDATION = 'e8ece3232c2f84192cf45c253c83058037eea2983516fdbb3528e7fc224b98c3'


def drawsha(dirs):
    h, n = hashlib.sha256(), 0
    for d in dirs:
        h.update(open(os.path.join(d, 'decks.jsonl'), 'rb').read())
        for f in sorted(glob.glob(os.path.join(d, 'decks', '*.dck'))):
            h.update(os.path.basename(f).encode() + b'\0' + open(f, 'rb').read())
            n += 1
    return '%s %d' % (h.hexdigest(), n)


def fsha(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()


def safe(f):
    try:
        return f()
    except (OSError, ValueError, KeyError, IndexError, TypeError):
        return None


def now(root, x):
    """[the folder's draw, deck 1's sha256, deck 2's] (None where a file is missing)"""
    band, seed = x.split('-')[1], x.split('-')[2]
    return [safe(lambda: drawsha([root + '/' + x])), safe(lambda: fsha('%s/%s/decks/%s-%s-00001.dck' % (root, x, band, seed))),
            safe(lambda: fsha('%s/%s/decks/%s-%s-00002.dck' % (root, x, band, seed)))]


def agree(x, base):
    a, b = now(D + '/' + base, x), now(R, x)
    return None not in a and a == b and a[0].endswith(' 2')


def state():
    s = {'spines': {x: now(D + '/decks', x) for x in SP}, 'validationBySet': {x: now(D + '/validation', x) for x in VA},
         'all13': safe(lambda: drawsha([D + '/decks/' + x for x in SP])), 'validation': safe(lambda: drawsha([D + '/validation/' + x for x in VA])),
         'smoke': safe(lambda: drawsha([D + '/decks/p-powered-2099']))}
    return s


out = {}
out['spines13'] = sum(1 for x in SP if agree(x, 'decks'))
out['validation13'] = sum(1 for x in VA if agree(x, 'validation'))
a13, r13 = safe(lambda: drawsha([D + '/decks/' + x for x in SP])), safe(lambda: drawsha([R + '/' + x for x in SP]))
out['all13'] = 1 if a13 is not None and a13 == r13 and a13.endswith(' 26') else 0
av, rv = safe(lambda: drawsha([D + '/validation/' + x for x in VA])), safe(lambda: drawsha([R + '/' + x for x in VA]))
out['validationAll'] = 1 if av is not None and av == rv and av.endswith(' 26') else 0
out['smokeData'] = 1 if safe(lambda: drawsha([D + '/decks/p-powered-2099'])) == REG_SMOKE else 0
out['smokeRedraw'] = 1 if safe(lambda: drawsha([R + '/p-powered-2099'])) == REG_SMOKE else 0
out['newDraws13'] = sum(1 for x in SP for v in [now(D + '/decks', x)[0]] if v is not None and v.split()[0] not in J171_DRAWS | J173_DRAWS | J177_DRAWS | J180_DRAWS | J181_DRAWS | J182_DRAWS | J183_DRAWS | J185_DRAWS | J186_DRAWS | J187_DRAWS | J188_DRAWS | J190_DRAWS | J191_DRAWS)
out['newValidation'] = 1 if av is not None and av.split()[0] not in (J171_VALIDATION, J173_VALIDATION, J177_VALIDATION, J180_VALIDATION, J181_VALIDATION, J182_VALIDATION, J183_VALIDATION, J185_VALIDATION, J186_VALIDATION, J187_VALIDATION, J188_VALIDATION, J190_VALIDATION, J191_VALIDATION) else 0
ok = out['spines13'] == 13 and out['validation13'] == 13 and out['all13'] == 1 and out['validationAll'] == 1 and out['smokeData'] == 1 and out['smokeRedraw'] == 1
if '--record' in sys.argv[1:]:
    if os.path.exists(REC):
        print('J193 draws: %s exists, kept as recorded' % REC)
    elif not ok:
        print('J193 draws: the draws do not agree, nothing recorded: %s' % json.dumps(out))
    else:
        with open(REC, 'w') as f:
            json.dump(dict(state(), note='J193 deck draws, recorded once by the pilot at the pin: D447 with D482\'s list, deck seeds 3685-3697 (spines), 3885-3897 (validation), 2099 (smoke); drawsha = each folder\'s decks.jsonl, then its .dck files by name'), f, indent=1)
        print('J193 draws: recorded in %s' % REC)
    sys.exit(0)
rec = safe(lambda: json.load(open(REC)))
if '--report' in sys.argv[1:]:
    print(json.dumps({'note': 'J193 deck draws, made by J193\'s pilot into lab-j193 and again into the clone, recorded once (draws-pilot.json)',
                      'asRun': state(), 'recorded': rec, 'redrawSpines': r13, 'redrawValidation': rv, 'smokeRegistered': REG_SMOKE}, indent=1))
    sys.exit(0)
cur = state()
out['recorded'] = 1 if rec and all(rec.get(k) == cur[k] for k in ('spines', 'validationBySet', 'all13', 'validation', 'smoke')) else 0
print(json.dumps(out))

// 📌 BondingCurveData의 sellPrice 값 배열 (단위: wei)
const sellPrices = [
    10929470000000, 12845990000000, 15150990000000, 17678030000000, 20634570000000,
    23654750000000, 26968430000000, 30290400000000, 33839350000000, 37379730000000,
    41302410000000, 45194220000000, 49240800000000, 53430100000000, 57753330000000,
    62204260000000, 66778590000000, 71473560000000, 76287620000000, 81351520000000,
    86399240000000, 91691330000000, 96977340000000, 102505600000000, 108271000000000,
    114041600000000, 120052100000000, 126189800000000, 132568200000000, 138971600000000,
    145728200000000, 152519000000000, 159561000000000, 166752700000000, 174202000000000,
    181911900000000, 189682000000000, 197722100000000, 206036000000000, 214527300000000,
    223302000000000, 232264300000000, 241520200000000, 250974300000000, 260732700000000,
    270700400000000, 280983500000000, 291588100000000, 302418800000000, 313582800000000,
    324984500000000, 336731600000000, 348727900000000, 361185100000000, 373800400000000,
    386890200000000, 400253600000000, 414001100000000, 428034100000000, 442464200000000,
    457298700000000, 472544700000000, 488101200000000, 504082700000000, 520386600000000,
    537239300000000, 554427900000000, 571957600000000, 590059400000000, 608516000000000,
    627446900000000, 646744500000000, 666646300000000, 686928500000000, 707714000000000,
    728892000000000, 750587100000000, 772927700000000, 795559800000000, 818853000000000,
    842571200000000, 866843700000000, 891678400000000, 917083200000000, 943065900000000,
    969506200000000, 996538400000000, 1024170000000000, 1052279000000000, 1081000000000000,
    1110477000000000, 1140451000000000, 1170927000000000, 1202182000000000, 1233953000000000,
    1266384000000000, 1299481000000000, 1333254000000000, 1367568000000000, 1402714000000000,
    1438415000000000, 1474821000000000, 1511940000000000, 1549633000000000, 1588052000000000,
    1627355000000000, 1667252000000000, 1707749000000000, 1749154000000000, 1791172000000000,
    1834118000000000, 1877690000000000, 1922050000000000, 1967048000000000, 2013007000000000,
    2059618000000000, 2107046000000000, 2155300000000000, 2204389000000000, 2254318000000000,
    2304931000000000, 2356399000000000, 2408731000000000, 2461933000000000, 2516015000000000,
    2570812000000000, 2626674000000000, 2683265000000000, 2740764000000000, 2799002000000000,
    2858341000000000, 2918433000000000, 2979642000000000, 3041618000000000, 3104548000000000,
    3168254000000000, 3233113000000000, 3298762000000000, 3365394000000000, 3433017000000000,
    3501637000000000, 3571264000000000, 3641713000000000, 3713180000000000, 3785675000000000,
    3859205000000000, 3933778000000000, 4009204000000000, 4085685000000001, 4163431000000001,
    4241847000000000, 4321543000000000, 4402327000000000, 4484000000000000, 4566773000000000,
    4650655000000000, 4735652000000000, 4821562000000000, 4908814000000000, 4996991000000000,
    5086313000000000, 5176786000000000, 5268203000000000, 5361003000000000, 5454760000000000,
    5549696000000000, 5645600000000000, 5742919000000000, 5841219000000000, 5940727000000000,
    6041451000000000, 6143400000000000, 6246580000000000, 6350770000000000, 6456205000000000,
    6562891000000000, 6670838000000000, 6779817000000000, 6890069000000000, 7001601000000000,
    7114421000000000, 7228536000000000, 7343713000000000, 7460199000000000, 7578000000000000,
    7697125000000000, 7817334000000000, 7939127000000001, 8062016999999999, 8186008000000000,
    8311607000000000, 8438319000000001, 8566403000000000, 8695865000000001, 8826713999999999,
    8958699000000001, 9092083000000000, 9226873000000000, 9363077000000000, 9500700000000000
];

// 📌 50만 개씩 판매 후 총 ETH 계산
const gastAmount = 500000n; // BigInt 사용 (정확한 계산을 위해)
const totalETH = sellPrices.reduce((acc, price) => acc + (BigInt(price) * gastAmount), 0n);

// 📌 ETH 값 변환 (wei → ETH, 1 ETH = 10^18 wei)
const totalETHInETH = totalETH / 10n ** 18n;

console.log(`💰 총 판매 ETH (Wei): ${totalETH}`);
console.log(`💰 총 판매 ETH (ETH 단위): ${totalETHInETH} ETH`);
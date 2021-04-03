let button = document.getElementById("button");

class Haffman {


    constructor() {
        this.symbols = {};
        this.symbolsCnt = 0;
    }

    encode(data) {
        this.calcSymbols(data);//вычисляем существующие символы и их частоту в сообщении
        let codes = this.calcCodes();//вычисляем коды символов
        console.log(codes);
        let encodedData = '';
        for (let i in data) {
            encodedData += codes[data[i]].code;
        }
        return {
            encodedData : encodedData,
            codes : codes
        };
    }

    calcCodes() {
        //Получаем граф
        this.getSortedSymbolsByRate()//сортируем все символы по частоте встречи в сообщении
        let codeGraph = new CodeGraph(this.symbols)//Подготавливем начальную конфигурацию графа для расчета кодов
        return codeGraph.calcCodes();//Строим граф и считаем коды для вершин
    }


    getSortedSymbolsByRate() {
        let symbolsArr = [];

        for (let key in this.symbols) {
            symbolsArr.push(this.symbols[key]);
        }

        function cmp(a, b) {
            if (a.rate > b.rate) {
                return 1
            } else
                return -1
        }
        symbolsArr.sort(cmp);

        return symbolsArr;
    }

    calcSymbols(data) {
        for (let i = 0; i < data.length; i++) {
            if (this.symbols[data[i]] === undefined) {
                this.symbols[data[i]] = new SymbolCode(data[i]);
                this.symbols[data[i]].addRate(data.length);
                this.symbolsCnt ++;
            } else {
                this.symbols[data[i]].addRate(data.length);
            }
        }
    }

}

button.onclick = function (){
    let inputData = document.getElementById("input").value;

    let haffman = new Haffman();
    let encodedData = haffman.encode(inputData);

    document.getElementById("output").innerText = encodedData.encodedData;
    document.getElementById("codes_output").innerHTML = encodedData.codes;
}

class SymbolCode {
    constructor(symbol) {
        this.symbol = symbol; //символ
        this.rate = 0; //частота встречи символа в сообщении
        this.code = ''; //двоичный код символа
    }

    addRate(messageLength) {
        this.rate += 1/messageLength;
    }
}

class CodeGraph {

    constructor(symbols) {
        this.activeVortexes = {};
        this.inactiveVortexes = {};
        this.activeVortexesCnt = 0;
        for (let key in symbols) {
            this.addStartVortex(symbols[key]);
        }
    }

    calcCodes() {
        if (this.activeVortexesCnt === 1) {
            let vortex = this.getMinActiveVortexAndDeactivate();
            vortex.isActive = false;
            vortex.code = 1;
        }
        while (this.activeVortexesCnt > 1) { //пока есть что суммировать производим процесс
            let zeroVortex = this.getMinActiveVortexAndDeactivate();
            let oneVortex = this.getMinActiveVortexAndDeactivate();
            this.sumVortexes(zeroVortex, oneVortex)
        }

        //Отталкиваясь от графа ищем коды для символов
        let vortex = this.getFinalVortex();
        this.calcCodeForVortex(vortex)

        //Возвращаем коды массивом
        let codes = {
            toString: function() {
                let string = '';
                for (let key in this) {
                    if (this[key].symbol !== undefined && this[key].code !== undefined)
                        string += `${this[key].symbol} - ${this[key].code}<br>`;
                }
                return string;
            }
        };
        for (let key in this.inactiveVortexes) {
            if (this.inactiveVortexes[key].symbol !== '') {
                codes[this.inactiveVortexes[key].symbol] = {
                    symbol : this.inactiveVortexes[key].symbol,
                    code : this.inactiveVortexes[key].code
                }
            }
        }
        return codes;
    }

    calcCodeForVortex (vortex) {
        if (vortex.prevZeroLink !== undefined) {
            vortex.prevZeroLink.code = vortex.code + '0';
            this.calcCodeForVortex(vortex.prevZeroLink);
        }
        if (vortex.prevOneLink !== undefined) {
            vortex.prevOneLink.code = vortex.code + '1';
            this.calcCodeForVortex(vortex.prevOneLink);
        }
        if (vortex.symbolLink !== undefined) {
            vortex.symbolLink.code = vortex.code;
        }
    }

    addStartVortex(symbolCode){
        let newVortex = new CodeVortex();
        newVortex.symbolLink = symbolCode;
        newVortex.symbol = symbolCode.symbol;
        newVortex.rate = symbolCode.rate;
        this.activeVortexes[newVortex.id] = newVortex;
        this.activeVortexesCnt++;
        return newVortex;
    }

    sumVortexes(zeroVortex, oneVortex) {
        let newVortex = new CodeVortex();
        newVortex.prevZeroLink = zeroVortex;
        newVortex.prevOneLink = oneVortex;
        newVortex.rate = zeroVortex.rate + oneVortex.rate;
        this.activeVortexes[newVortex.id] = newVortex;
        this.activeVortexesCnt++;
        //this.deactivateVortex(zeroVortex);
        //this.deactivateVortex(oneVortex);
        return newVortex;
    }

    deactivateVortex(vortex) {
        vortex.isActive = false;
        this.inactiveVortexes[vortex.id] = vortex;
        delete this.activeVortexes[vortex.id]
        this.activeVortexesCnt--;
    }

    getMinActiveVortexAndDeactivate() {
        let minVortex = undefined;
        let minVortexRate = 2;
        for (let vortexId in this.activeVortexes) {
            if (this.activeVortexes[vortexId].rate < minVortexRate) {
                minVortex = this.activeVortexes[vortexId];
                minVortexRate = this.activeVortexes[vortexId].rate;
            }
        }
        this.deactivateVortex(minVortex);
        return minVortex;
    }

    getFinalVortex() {
        if (Object.keys(this.activeVortexes).length === 1) {
            return this.activeVortexes[Object.keys(this.activeVortexes)[0]]
        } else {
            return -1;
        }
    }
}

class CodeVortex {

    static nextId = 0;

    constructor() {
        this.symbol = "";
        this.prevZeroLink = undefined; //ссылка на предыдущию вершину с нулем
        this.prevOneLink = undefined; //ссылка на предыдущию вершину с единицей
        this.rate = 0; //сумма вероятностей для этой вершины пути
        this.isActive = true;
        this.id = 'id' + CodeVortex.nextId;
        this.code = '';
        CodeVortex.nextId++;
    }
}

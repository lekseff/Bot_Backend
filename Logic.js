const {v4} = require('uuid');
const fetch = require('node-fetch');

class Logic {
    constructor() {
      this.numberLatter = 10; // Кол-во загружаемых сообщений
      this.dataBase = [
        // {
        //   event: 'newMessage',
        //   message: '1',
        //   type: 'text',
        //   id: '9ccd6f8c-dda2-4f43-9b24-00da6ceeba81',
        //   date: '06.07.2022, 00:29:47'
        // },
      ];      
    }

  /**
   * Обработка сообщений чата
   * @param {*} data - данные
   * @returns объект данных + Url
   */
  processingData(data) {
    // Дополняем полученные данные
    const message = {
      ...data,
      id: v4(),
      date: new Date(Date.now()).toLocaleString(),
    }

    if (data.event === 'command') {
        return this.botCommandHandler(message);
    }

    // if (data.type === 'file') {}

    if (data.type === 'text' ) {
         // Проверка на наличие ссылки в сообщении
      const text = message.message;
      const checkUrl = this.validateMessage(text);
      message.message = checkUrl;          
    }

    if (data.event !== 'command') {
      this.dataBase.push(message);
    }

    return message; 
  }

  /**
   * Проверяет сообщение на наличие ссылки
   * @param {*} text - проверяемый текст сообщения
   * @returns - текст сообщения с тегами ссылки
   */
  validateMessage(text) {
    const validText = text.split(' ')
      .map((word) => {
       if (this.isValidHttpUrl(word)) {
        return `<a href="${word}">${word}</a>`
       }
       return word;
    });
    return validText.join(' ');
  }

  /**
   * Проверяет является ли текст ссылкой
   * @param {*} word - текст
   * @returns - true/false
   */
  isValidHttpUrl(word) {
    let url;
    try {
      url = new URL(word);
    } catch (e) {
      return false;  
    }
    return url.protocol === 'http:' || url.protocol === 'https:';
  }

  /**
   * Загрузка последних N сообщений
   * @returns - массив из последних сообщений
   */
  getLastMessage(data) {

    if (!this.dataBase.length) {
      return {
        event: 'getLastMessage',
        status: false,
      }
    }

    let lastMessages = null;
    if (this.dataBase.length <= this.numberLatter) {
      lastMessages = this.dataBase.slice();
    } else {
      const startIndex = this.dataBase.length - this.numberLatter;
      lastMessages = this.dataBase.slice(startIndex);
    }
    
    return {
      event: 'getLastMessage',
      status: true,
      message: lastMessages,
    }
  }

  /**
   * Загрузка ранних сообщений
   * @param {*} data - {id, event}
   * @returns - {event, status: boolean, messages: Array}
   */
  loadHistory(data) {
    const { id } = data;
    if (!id) return;
    const indexLastMessage = this.dataBase.findIndex((msg) => msg.id === id);
    let startIndex = indexLastMessage - this.numberLatter;
    if (indexLastMessage === 0) {
      return {        
          event: 'getHistory',
          status: false,
      }
    }
    //Если больше нет сообщений в истории
    if (startIndex < 0) startIndex = 0;
    const messages = this.dataBase.slice(startIndex, indexLastMessage).reverse();
    return {
      event: 'getHistory',
      status: true,
      message: messages,
    }
  }

  /**
   * Обрабатывает команды бота
   * @param {*} data - {}
   */
  async botCommandHandler(data) {
    const { message} = data;
    let [, command] = message.split(' ');
    command = command.trim();

    if (command === 'погода') {
      const response = await this.getWeather(data.location);
      if (!response.error) {
        const { current, location } = response;
        const weather = {
          location: location.name,
          temp: current.temp_c,
          condition: current.condition.text,
          icon: 'http:' + current.condition.icon,
        };
        return {...data, weather, type: 'weather'};
      } else {
        return {...data, type: 'text', message: response.error.message};
      }      
    }

    if (command === 'news') {
      const response = await this.getNews();
      if (response.status === 'success') {
        const randomNewsNumber = this.randomNumber(response.results.length);
        const randomNews = response.results[randomNewsNumber];
        return {...data, news: randomNews, type: 'news'};
      } else {
        return {...data, type: 'text', message: 'Ошибка загрузки данных'};
      }   
    }

    if (command === 'crypto') {
      try {
        const response = await this.getBitconСourse();
        const course = response.USD;
        const text = `Курс Bitcoin: ${course.last} USD`;
        return {...data, type: 'text', message: text};
      }catch(err) {
        return {...data, type: 'text', message: 'Ошибка подключения'};
      }
      
    }

    if (command === 'usd' || command === 'eur') {
      const response = await this.getCurrencyCourse();
      const course = response.Valute[command.toUpperCase()];
      const text = `${course.Name}:  ${course.Value.toFixed(2)} руб.`
      return {...data, type: 'text', message: text}
    }

    return {...data, type: 'text', message: 'Не верная команда'};
  }

  /**
   * Получает данные о погоде по API
   * @param {*} param0 - объект с координатами
   * @returns - объект, ответ сервера 
   */
  async getWeather({ latitude, longitude }) {
    const url = 'http://api.weatherapi.com/v1/current.json';
    const params = {
      key: '4ab5c720755741ffa8b141807220707',
      lang: 'ru',
      q: `${latitude},${longitude}`,      
    }
    const paramString = new URLSearchParams(params);
    const response = await fetch(`${url}?${paramString}`);
    const data = await response.json();   
    return data;
  }

  /**
   * Получает новости по API
   * @returns - объект, ответ сервера 
   */
  async getNews() {
    const url = 'https://newsdata.io/api/1/news';
    const params = {
      apikey: 'pub_9044a4abeb1df26337310fe3781c772dd993',
      country: 'ru',
      category: 'technology'
    };
    const paramString = new URLSearchParams(params);
    const response = await fetch(`${url}?${paramString}`);
    const data = response.json();
    return data;
      
  }

  /**
   * Получает курс Bitcoin по API
   * @returns - response object
   */
  async getBitconСourse() {
      const response = await fetch('https://blockchain.info/ticker');
      if (response.status >= 200 && response.status < 300) {
        const data = await response.json();
        return data;
      }      
    }

  async getCurrencyCourse() {
    const response = await fetch(' https://www.cbr-xml-daily.ru/daily_json.js');
    if (response.status >= 200 && response.status < 300) {
      const data = await response.json();
      return data;
    }    
  }


  /**
   * Возвращает случайное число
   * @param {*} max - максимальное число
   * @returns Numbers 
   */
  randomNumber(max) {
    return Math.floor(Math.random() * max);
  }  
}

module.exports = Logic;
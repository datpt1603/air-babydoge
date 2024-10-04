const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');

class BabyDoge {
    constructor() {
        this.headers = { 
            'accept': 'application/json, text/plain, */*', 
            'accept-encoding': 'gzip, deflate, br, zstd', 
            'accept-language': 'en-GB,en;q=0.9,en-US;q=0.8,ja;q=0.7', 
            'content-type': 'application/x-www-form-urlencoded', 
            'origin': 'https://babydogeclikerbot.com', 
            'referer': 'https://babydogeclikerbot.com/', 
            'sec-ch-ua': '"Microsoft Edge";v="129", "Not=A?Brand";v="8", "Chromium";v="129"', 
            'sec-ch-ua-mobile': '?0', 
            'sec-ch-ua-platform': '"Windows"', 
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0'
        };

        this.authenticateUrl = 'https://backend.babydogepawsbot.com/authorize';
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        const maxUpgradeCost = 1000000;

        while (true) {
            console.log(`Đã dùng thì đừng sợ, đã sợ thì đừng dùng...`.yellow);

            for (let i = 0; i < data.length; i++) {
                const init_data = data[i];
                const userData = JSON.parse(decodeURIComponent(init_data.split('user=')[1].split('&')[0]));
                const firstName = userData.first_name;

                console.log(`========== Tài khoản ${i + 1} | ${firstName.green} ==========`);

                const loginData = await this.authenticate(init_data);
                if (!loginData) {
                    this.log('Đăng nhập thất bại, chuyển sang tài khoản tiếp theo.'.red);
                    continue;
                }

                const { access_token, energy, points_per_tap } = loginData;

                if (access_token) {
                    await this.daily(access_token);

                    const availableChannels = await this.getTask(access_token);
                    for (const channel of availableChannels) {
                        await this.claimTask(access_token, channel);
                    }

                    await this.tapdc(access_token, energy, points_per_tap);

                    await this.buyCards(access_token);
                    await this.upgradeMyCards(access_token, maxUpgradeCost);
                }

                await this.countdown(5000);
            }

            await this.waitWithCountdown(60);
        }
    }

    async authenticate(init_data) {
        try {
            const userData = await this.decodeData(init_data);
            const payload = {
                user: userData.userEncoded,
                auth_date: userData.auth_date,
                hash: userData.hash,
                query_id: userData.query_id,
                referrer: '673750261'
            };

            const res = await axios.post(this.authenticateUrl, payload, { headers: this.headers });

            if (res.data) {
                this.log('Đăng nhập thành công!'.green);
                const { balance, energy, max_energy, access_token, league } = res.data;
                const points_per_tap = league.points_per_tap;
                this.log('Balance:'.green + ` ${balance}`);
                this.log('Năng lượng:'.green + ` ${energy}/${max_energy}`);
                this.log('Points per tap:'.green + ` ${points_per_tap}`);
                return { access_token, energy, points_per_tap };
            } else {
                this.log('Đăng nhập thất bại!'.red);
                return null;
            }
        } catch (error) {
            this.log(`Không thể xác thực tài khoản: ${error.message}`, 'error');
            return null;
        }
    }

    async daily(access_token) {
        const checkUrl = 'https://backend.babydogepawsbot.com/getDailyBonuses';
        const claimUrl = 'https://backend.babydogepawsbot.com/pickDailyBonus';
        const headers = { ...this.headers, 'X-Api-Key': access_token };

        try {
            const checkRes = await this.http(checkUrl, headers);
            if (checkRes.data && checkRes.data.has_available) {
                this.log('Điểm danh hàng ngày có sẵn!'.yellow);
                const claimRes = await this.http(claimUrl, headers, '');
                if (claimRes.data) {
                    this.log('Điểm danh hàng ngày thành công!'.green);
                } else {
                    this.log('Điểm danh hàng ngày thất bại!'.red);
                }
            } else {
                this.log('Hôm nay đã điểm danh hàng ngày.'.yellow);
            }
        } catch (error) {
            this.log(`Lỗi khi kiểm tra hoặc claim daily bonus: ${error.message}`.red);
        }
    }

    async getTask(access_token) {
        const url = 'https://backend.babydogepawsbot.com/channels';
        const headers = { ...this.headers, 'X-Api-Key': access_token };
    
        try {
            const res = await this.http(url, headers);
            if (res && res.data && res.data.channels) {
                const availableChannels = res.data.channels.filter(channel => channel.is_available && channel.type !== 'telegram');
                return availableChannels;
            } else {
                this.log('Không có nhiệm vụ nào có sẵn.'.yellow);
                return [];
            }
        } catch (error) {
            this.log(`Lỗi rồi: ${error.message}`.red);
            return [];
        }
    }

    async claimTask(access_token, channel) {
        const url = 'https://backend.babydogepawsbot.com/channels';
        const headers = { ...this.headers, 'X-Api-Key': access_token, 'Content-Type': 'application/json' };
        const data = JSON.stringify({ channel_id: channel.id });
    
        try {
            const res = await this.http(url, headers, data);
            if (res && res.data) {
                this.log(`Đang làm nhiệm vụ: ${channel.title.yellow}... Trạng thái: thành công`);
            } else {
                this.log(`Lỗi khi nhận phần thưởng cho nhiệm vụ: ${channel.title}`.red);
            }
        } catch (error) {
            this.log(`Lỗi khi nhận phần thưởng: ${error.message}`.red);
        }
    }

    async tapdc(access_token, initialEnergy, points_per_tap) {
        const url = 'https://backend.babydogepawsbot.com/mine';
        const headers = { ...this.headers, 'X-Api-Key': access_token, 'Content-Type': 'application/json' };
        let energy = initialEnergy;
        try {
            while (energy >= 50) {
                const randomEnergy = Math.floor(Math.random() * (50 - 10 + 1)) + 10;
                let count = Math.floor((energy - randomEnergy) / points_per_tap);
    
                if (count <= 0) {
                    this.log('Năng lượng không đủ để tiếp tục tap...chuyển tài khoản!'.yellow);
                    break;
                }

                const data = JSON.stringify({ count });

                const res = await this.http(url, headers, data);
                if (res.data) {
                    const { balance, mined, newEnergy, league, current_league, next_league } = res.data.mine;

                    this.log(`Đã tap ${String(mined).yellow} lần. Balance: ${String(balance).yellow} Năng lượng: ${String(newEnergy).yellow}`);

                    energy = newEnergy;

                    if (energy < 50) {
                        this.log('Năng lượng quá thấp để tiếp tục tap...chuyển tài khoản!'.yellow);
                        break;
                    }
                } else {
                    this.log('Lỗi rồi, không thể tap!'.red);
                    break;
                }
            }
        } catch (error) {
            this.log(`Lỗi rồi: ${error.message}`.red);
        }
    }

    async buyCards(access_token) {
        const listCardsUrl = 'https://backend.babydogepawsbot.com/cards';
        const upgradeUrl = 'https://backend.babydogepawsbot.com/cards';
        const getMeUrl = 'https://backend.babydogepawsbot.com/getMe';
        const headers = { ...this.headers, 'X-Api-Key': access_token, 'Content-Type': 'application/json' };
    
        try {
            const getMeRes = await this.http(getMeUrl, headers);
            let balance = getMeRes.data.balance;
    
            const res = await this.http(listCardsUrl, headers);
            if (res.data && res.data.length > 0) {
                for (const category of res.data) {
                    for (const card of category.cards) {
                        if (balance < card.upgrade_cost) {
                            this.log(`Số dư không đủ để mua thẻ !`.red);
                            return;
                        }
    
                        if (card.cur_level === 0 && card.is_available) {
                            const upgradeData = JSON.stringify({ id: card.id });
                            const upgradeRes = await this.http(upgradeUrl, headers, upgradeData);
                            if (upgradeRes.data) {
                                balance = upgradeRes.data.balance;
                                this.log(`Đang mua thẻ ${card.name.yellow}...Trạng thái: ${'Thành công'.green} Balance mới: ${String(balance).yellow}`);
                            } else {
                                this.log(`Đang mua thẻ ${card.name.yellow}...Trạng thái: ${'Thất bại'.red}`);
                            }
                        }
                    }
                }
            } else {
                this.log('Không có thẻ mới nào.'.yellow);
            }
        } catch (error) {
            this.log(`Lỗi rồi: ${error.message}`.red);
        }
    }

    async upgradeMyCards(access_token, maxUpgradeCost) {
        const listCardsUrl = 'https://backend.babydogepawsbot.com/cards';
        const upgradeUrl = 'https://backend.babydogepawsbot.com/cards';
        const getMeUrl = 'https://backend.babydogepawsbot.com/getMe';
        const headers = { ...this.headers, 'X-Api-Key': access_token, 'Content-Type': 'application/json' };
    
        try {
            const getMeRes = await this.http(getMeUrl, headers);
            let balance = getMeRes.data.balance;
    
            const res = await this.http(listCardsUrl, headers);
            if (res.data && res.data.length > 0) {
                let allCards = res.data.flatMap(category => category.cards);
                let upgradedThisCycle = new Set();
    
                while (true) {
                    allCards.sort((a, b) => b.cur_total_farming - a.cur_total_farming);
    
                    let upgradedAny = false;
                    for (const card of allCards) {
                        if (!upgradedThisCycle.has(card.id) &&  balance >= card.upgrade_cost &&  card.is_available && card.upgrade_cost <= maxUpgradeCost) {
                            const upgradeData = JSON.stringify({ id: card.id });
                            const upgradeRes = await this.http(upgradeUrl, headers, upgradeData);
                            if (upgradeRes.data) {
                                balance = upgradeRes.data.balance;
                                this.log(`Đang nâng cấp thẻ ${card.name.yellow}...Trạng thái: ${'Thành công'.green} Balance mới: ${String(balance).yellow}`);
                                upgradedAny = true;
                                upgradedThisCycle.add(card.id);
                                card.cur_level += 1;
                                card.upgrade_cost = upgradeRes.data.next_upgrade_cost;
                                card.cur_total_farming = upgradeRes.data.cur_total_farming;
                            } else {
                                this.log(`Đang nâng cấp thẻ ${card.name.yellow}...Trạng thái: ${'Thất bại'.red}`);
                            }
                            break;
                        } else if (card.upgrade_cost > maxUpgradeCost) {
                            this.log(`Không nâng cấp thẻ ${card.name.yellow}: Upgrade cost (${card.upgrade_cost}) vượt quá giới hạn (${maxUpgradeCost})`.yellow);
                        }
                    }
                    if (!upgradedAny) {
                        break;
                    }
                    if (upgradedThisCycle.size === allCards.length) {
                        upgradedThisCycle.clear();
                    }
                }
            } else {
                this.log('Không có thẻ nào cần nâng cấp.'.yellow);
            }
        } catch (error) {
            this.log(`Lỗi khi nâng cấp thẻ: ${error.message}`.red);
        }
    }

    async http(url, headers, data = null) {
        let attempts = 0;
        const maxAttempts = 3;
    
        while (attempts < maxAttempts) {
            try {
                const options = { headers };
                let res;
                if (data === null) {
                    res = await axios.get(url, options);
                } else {
                    res = await axios.post(url, data, options);
                }
                if (typeof res.data !== 'object') {
                    this.log('Không nhận được phản hồi JSON hợp lệ !'.red);
                    attempts++;
                    await this.sleep(2000);
                    continue;
                }
                return res;
            } catch (error) {
                attempts++;
                if (error.response && error.response.data && error.response.data.code === 403 && error.response.data.message === 'requirements not met') {
                    this.log('Requirements not met'.yellow);
                    return { data: error.response.data };
                }
                this.log(`Lỗi kết nối (Lần thử ${attempts}/${maxAttempts}): ${error.message}`.red);
                console.log(error);
                if (attempts < maxAttempts) {
                    await this.sleep(5000);
                } else {
                    break;
                }
            }
        }
        throw new Error('Không thể kết nối sau 3 lần thử');
    }

    askQuestion(query) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        return new Promise(resolve => rl.question(query, ans => {
            rl.close();
            resolve(ans);
        }))
    }

    async countdown(t) {
        for (let i = t; i > 0; i--) {
            const hours = String(Math.floor(i / 3600)).padStart(2, '0');
            const minutes = String(Math.floor((i % 3600) / 60)).padStart(2, '0');
            const seconds = String(i % 60).padStart(2, '0');
            process.stdout.write(colors.white(`[*] Cần chờ ${hours}:${minutes}:${seconds}     \r`));
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        process.stdout.write('                                        \r');
    }

    log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        switch(type) {
            case 'success':
                console.log(`[${timestamp}] [*] ${msg}`.green);
                break;
            case 'custom':
                console.log(`[${timestamp}] [*] ${msg}`.magenta);
                break;        
            case 'error':
                console.log(`[${timestamp}] [!] ${msg}`.red);
                break;
            case 'warning':
                console.log(`[${timestamp}] [*] ${msg}`.yellow);
                break;
            default:
                console.log(`[${timestamp}] [*] ${msg}`);
        }
    }

    async waitWithCountdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`===== Đã hoàn thành tất cả tài khoản, chờ ${i} giây để tiếp tục vòng lặp =====`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('');
    }

    async decodeData(initData) {
        const urlParams = new URLSearchParams(initData);
        const user = JSON.parse(decodeURIComponent(urlParams.get('user')));
        return {
            auth_date: urlParams.get('auth_date'),
            hash: urlParams.get('hash'),
            query_id: urlParams.get('query_id'),
            chat_instance: urlParams.get('chat_instance'),
            user: user,
            userEncoded: urlParams.get('user')
        };
    }
}

if (require.main === module) {
    const babydoge = new BabyDoge();
    babydoge.main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}
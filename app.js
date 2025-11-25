// app.js
class ArweaveAppCertificateApp {
    constructor() {
        this.bundlrManager = null;
        this.isConnected = false;
        this.currentAddress = null;
        
        this.init();
    }

    init() {
        this.initEventListeners();
        this.checkArweaveAppAvailability();
    }

    initEventListeners() {
        document.getElementById('connectWallet').addEventListener('click', () => {
            this.connectWallet();
        });

        document.getElementById('disconnectWallet').addEventListener('click', () => {
            this.disconnectWallet();
        });

        document.getElementById('certificateForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateCertificate();
        });
    }

    async checkArweaveAppAvailability() {
        const statusElement = document.getElementById('walletStatus');
        
        if (window.arweaveWallet) {
            statusElement.textContent = '✅ Detectada';
            statusElement.className = 'success';
            document.getElementById('connectWallet').disabled = false;
        } else {
            statusElement.textContent = '❌ No detectada';
            statusElement.className = 'error';
            document.getElementById('connectWallet').disabled = true;
            document.getElementById('connectWallet').innerHTML = 'Instalar Arweave.app';
            document.getElementById('connectWallet').onclick = () => {
                window.open('https://arweave.app', '_blank');
            };
        }
    }

    async connectWallet() {
        try {
            this.showLoading('Conectando con Arweave.app...');
            
            if (!window.arweaveWallet) {
                throw new Error('Arweave.app no detectada');
            }

            // Conectar con Arweave.app
            await window.arweaveWallet.connect([
                'ACCESS_ADDRESS',
                'SIGN_TRANSACTION',
                'ACCESS_PUBLIC_KEY'
            ]);

            const address = await window.arweaveWallet.getActiveAddress();
            
            // Inicializar Irys (ex-Bundlr)
            this.bundlrManager = new IrysManager('testnet');
            await this.bundlrManager.initialize();
            
            const balance = await this.bundlrManager.getBalance();
            
            // Actualizar UI
            document.getElementById('walletAddress').textContent = 
                `${address.slice(0, 8)}...${address.slice(-8)}`;
            document.getElementById('walletBalance').textContent = balance;
            document.getElementById('walletNetwork').textContent = 'Testnet (Gratuito)';
            
            document.getElementById('walletInfo').classList.remove('hidden');
            document.getElementById('certificate-section').classList.remove('hidden');
            document.getElementById('connectWallet').classList.add('hidden');
            
            this.isConnected = true;
            this.currentAddress = address;
            
            this.hideLoading();
            this.showMessage('✅ Conectado exitosamente con Arweave.app', 'success');
            
        } catch (error) {
            this.hideLoading();
            console.error('Error conectando Arweave.app:', error);
            this.showMessage('❌ ' + error.message, 'error');
        }
    }

    async disconnectWallet() {
        try {
            if (this.bundlrManager) {
                await this.bundlrManager.disconnect();
            }
            
            document.getElementById('walletInfo').classList.add('hidden');
            document.getElementById('certificate-section').classList.add('hidden');
            document.getElementById('result-section').classList.add('hidden');
            document.getElementById('connectWallet').classList.remove('hidden');
            
            this.isConnected = false;
            this.bundlrManager = null;
            this.currentAddress = null;
            
            this.showMessage('✅ Desconectado de Arweave.app', 'success');
            
        } catch (error) {
            console.error('Error desconectando:', error);
            this.showMessage('Error al desconectar: ' + error.message, 'error');
        }
    }

    async generateCertificate() {
        if (!this.isConnected) {
            this.showMessage('Por favor conecta Arweave.app primero', 'error');
            return;
        }

        const tallerista = document.getElementById('tallerista').value;
        const curso = document.getElementById('curso').value;
        const fecha = document.getElementById('fecha').value;

        if (!tallerista || !curso || !fecha) {
            this.showMessage('Por favor completa todos los campos', 'error');
            return;
        }

        try {
            this.showLoading('Generando certificado... Arweave.app pedirá confirmación');
            
            // 1. Generar PDF (simulado)
            const pdfBuffer = await this.generatePDFBuffer(tallerista, curso, fecha);
            
            // 2. Generar hash del PDF
            const pdfHash = await this.generateHash(pdfBuffer);
            
            // 3. Subir a Arweave usando Irys
            const result = await this.bundlrManager.uploadPDF(pdfBuffer, {
                tallerista,
                curso, 
                fecha,
                hash: pdfHash,
                emisor: 'Sistema-Certificados',
                version: '1.0.0'
            });

            // 4. Preparar datos para Sonic
            const sonicData = {
                hash: pdfHash,
                transaccionArweave: result.transactionId,
                nombreTallerista: tallerista,
                curso: curso,
                fechaEmision: fecha,
                urlArweave: result.url,
                timestamp: new Date().toISOString(),
                tamañoArchivo: result.size,
                wallet: 'Arweave.app',
                red: 'testnet'
            };

            // 5. Guardar en Sonic (opcional)
            await this.guardarEnSonic(sonicData);

            // 6. Mostrar resultado
            this.showResult(result, pdfHash);
            this.hideLoading();

        } catch (error) {
            this.hideLoading();
            console.error('Error generando certificado:', error);
            this.showMessage('❌ Error: ' + error.message, 'error');
        }
    }

    async generatePDFBuffer(tallerista, curso, fecha) {
        const pdfContent = `
            CERTIFICADO DE PARTICIPACIÓN - TESTNET
            ======================================
            
            Otorgado a: ${tallerista}
            
            Por haber completado exitosamente el curso:
            "${curso}"
            
            Fecha de emisión: ${fecha}
            
            ✅ ALMACENADO EN ARWEAVE TESTNET
            🔗 Transacción permanente en blockchain
            📍 Red: Testnet (Gratuita)
            
            Timestamp: ${new Date().toISOString()}
        `;
        
        return new TextEncoder().encode(pdfContent);
    }

    async generateHash(buffer) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    async guardarEnSonic(sonicData) {
        try {
            console.log('📊 Datos para Sonic:', sonicData);
            // Aquí tu implementación de Sonic
        } catch (error) {
            console.warn('⚠️ No se pudo guardar en Sonic:', error.message);
        }
    }

    showResult(result, hash) {
        const resultSection = document.getElementById('result-section');
        const resultContent = document.getElementById('resultContent');
        
        resultContent.innerHTML = `
            <div class="result">
                <h3 class="success">✅ Certificado Creado en TESTNET</h3>
                <p><strong>🔐 Hash del PDF:</strong> ${hash}</p>
                <p><strong>📄 Transacción ID:</strong> ${result.transactionId}</p>
                <p><strong>🔗 URL permanente:</strong> 
                    <a href="${result.url}" target="_blank" style="color: var(--primary);">
                        Ver en Arweave
                    </a>
                </p>
                <p><strong>💰 Costo:</strong> ${result.cost} AR (Testnet - Gratuito)</p>
                <p><strong>👛 Wallet usada:</strong> ${result.wallet}</p>
                <p><strong>🌐 Red:</strong> ${result.network}</p>
                <p><strong>📏 Tamaño:</strong> ${result.size} bytes</p>
                <p><strong>📅 Fecha:</strong> ${new Date(result.timestamp).toLocaleString()}</p>
            </div>
        `;
        
        resultSection.classList.remove('hidden');
        document.getElementById('certificateForm').reset();
    }

    showLoading(message) {
        document.getElementById('loadingMessage').textContent = message;
        document.getElementById('loading-section').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading-section').classList.add('hidden');
    }

    showMessage(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = type === 'error' ? 'error' : 'result';
        alertDiv.textContent = message;
        alertDiv.style.margin = '10px 0';
        
        document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.container').firstChild);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }
}

// Clase IrysManager (ex-Bundlr)
class IrysManager {
    constructor(networkType = 'testnet') {
        this.networkType = networkType;
        this.irys = null;
        this.wallet = null;
        this.isConnected = false;
    }

    async initialize() {
        try {
            if (!window.arweaveWallet) {
                throw new Error('Arweave.app no detectada');
            }

            this.wallet = window.arweaveWallet;
            const address = await this.wallet.getActiveAddress();
            
            const networkConfig = this.getNetworkConfig();
            
            // Inicializar Irys
            this.irys = new window.Irys({
                url: networkConfig.url,
                token: networkConfig.token,
                wallet: { provider: this.wallet }
            });
            
            await this.irys.ready();
            
            console.log(`✅ Irys inicializado con Arweave.app en ${networkConfig.name}`);
            console.log('📍 Address:', address);
            
            this.isConnected = true;
            return {
                address,
                network: networkConfig.name
            };
            
        } catch (error) {
            console.error('❌ Error inicializando Irys:', error);
            throw error;
        }
    }

    getNetworkConfig() {
        const networks = {
            mainnet: {
                name: "Irys Mainnet",
                url: "https://node1.irys.xyz",
                token: "arweave",
                explorer: "https://arweave.net"
            },
            testnet: {
                name: "Irys DevNet - TESTNET", 
                url: "https://devnet.irys.xyz",
                token: "arweave",
                explorer: "https://arweave.net"
            }
        };
        
        return networks[this.networkType] || networks.testnet;
    }

    async uploadPDF(fileBuffer, metadata = {}) {
        if (!this.isConnected || !this.irys) {
            await this.initialize();
        }

        try {
            const tags = [
                { name: 'Content-Type', value: 'application/pdf' },
                { name: 'App-Name', value: 'Sistema-Certificados' },
                { name: 'App-Version', value: '1.0.0' },
                { name: 'Wallet', value: 'Arweave.app' },
                { name: 'Network', value: 'testnet' },
                { name: 'Type', value: 'certificate' },
                { name: 'Timestamp', value: Date.now().toString() }
            ];

            Object.entries(metadata).forEach(([key, value]) => {
                if (value) {
                    tags.push({ name: key, value: value.toString() });
                }
            });

            const price = await this.irys.getPrice(fileBuffer.length);
            const formattedPrice = this.irys.utils.fromAtomic(price);
            
            console.log(`💰 Costo estimado: ${formattedPrice} AR`);

            const transaction = await this.irys.upload(fileBuffer, { tags });
            
            const explorerUrl = `${this.getNetworkConfig().explorer}/${transaction.id}`;
            
            console.log('✅ PDF subido exitosamente');
            console.log('📄 Transaction ID:', transaction.id);

            return {
                success: true,
                transactionId: transaction.id,
                url: explorerUrl,
                size: fileBuffer.length,
                cost: formattedPrice,
                network: 'testnet',
                wallet: 'Arweave.app',
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Error subiendo PDF:', error);
            throw error;
        }
    }

    async getBalance() {
        if (!this.irys) {
            await this.initialize();
        }
        const balance = await this.irys.getLoadedBalance();
        return this.irys.utils.fromAtomic(balance);
    }

    async disconnect() {
        if (this.wallet) {
            await this.wallet.disconnect();
            this.isConnected = false;
            this.irys = null;
            this.wallet = null;
            console.log('✅ Desconectado de Arweave.app');
        }
    }
}

// Inicializar la aplicación cuando cargue la página
document.addEventListener('DOMContentLoaded', () => {
    new ArweaveAppCertificateApp();
});
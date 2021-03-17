var path = require('path');

const HtmlWebPackPlugin = require('html-webpack-plugin');

module.exports = [
    Object.assign({}, {
        entry: [
            './src/index.tsx',
        ],
        resolve: {
            modules: [
                'src',
                'node_modules'
            ],
            extensions: ['*', '.js', '.jsx', '.ts', '.tsx']
        },
        module: {
            rules: [
                {
                    test: /\.(ts|tsx)$/,
                    exclude: /node_modules/,
                    use: 'ts-loader'
                }
            ]
        },
        externals: {
            react: 'React',
            redux: 'Redux',
            'react-redux': 'ReactRedux',
            'prop-types': 'PropTypes',
            'react-bootstrap': 'ReactBootstrap'
        },
        output: {
            path: path.join(__dirname, '/dist'),
            publicPath: '/',
            filename: 'main.js'
        }
    }),
    Object.assign({}, {
        entry: [
            './src/jaas/index.tsx',
        ],
        resolve: {
            modules: [
                'src/jaas',
                'node_modules'
            ],
            extensions: ['*', '.js', '.jsx', '.ts', '.tsx']
        },
        output: {
            path: path.join(__dirname, '/dist/jaas'),
            publicPath: '/plugins/jitsi/',
            filename: 'jaas-main.js'
        },
        module: {
            rules: [
                {
                    test: /\.(ts|tsx)$/,
                    exclude: /node_modules/,
                    use: 'ts-loader'
                }
            ]
        },
        plugins: [
            new HtmlWebPackPlugin({
                template: './src/jaas/index.html',
                filename: 'index.html',
                inject: true
            })
        ]
    })
];

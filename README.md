# Testbook

Testbook is a tool for creating React component tests.

It currently supports apps created by CRA.

## Running

Testbook runs in your browser, to start it from your CRA project use the following command:
```
npx testbook
```

Once you have created tests, use the following to run those tests on the cli (suitable for CI):
```
npx testbook cli
```

## Contributing

Clone and run the following in the Testbook directory:

```
yarn link
```

To the start the dev api server, pick any CRA project directory and run:
```
yarn link testbook
npx testbook dev
```
To run the client dev server run the following from the Testbook directory:
```
yarn start
```

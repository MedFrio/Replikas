import Database from '../src/model/Database';

jest.setTimeout(10000);
test('Connecting to the database works', async () => {
	const database = Database.get();
	{
		await database`DELETE FROM test`;
		const result = await database`SELECT * FROM test`;
		expect(result.count).toBe(0);
	}
	{
		await database`INSERT INTO test (id, name) VALUES (1, 'test')`;
		const result = await database`SELECT * FROM test`;
		expect(result.count).toBe(1);
	}
});

afterAll(async () => {
	await Database.close();
});

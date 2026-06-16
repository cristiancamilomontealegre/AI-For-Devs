import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

type QueryBuilderMock<T extends ObjectLiteral> = {
  leftJoin: jest.Mock;
  leftJoinAndSelect: jest.Mock;
  andWhere: jest.Mock;
  where: jest.Mock;
  having: jest.Mock;
  orderBy: jest.Mock;
  select: jest.Mock;
  addSelect: jest.Mock;
  setParameter: jest.Mock;
  setParameters: jest.Mock;
  groupBy: jest.Mock;
  getQuery: jest.Mock;
  getMany: jest.Mock;
  getRawOne: jest.Mock;
  getRawMany: jest.Mock;
} & SelectQueryBuilder<T>;

export function createQueryBuilderMock<T extends ObjectLiteral>(): QueryBuilderMock<T> {
  const mock: Partial<QueryBuilderMock<T>> = {
    leftJoin: jest.fn(),
    leftJoinAndSelect: jest.fn(),
    andWhere: jest.fn(),
    where: jest.fn(),
    having: jest.fn(),
    orderBy: jest.fn(),
    select: jest.fn(),
    addSelect: jest.fn(),
    setParameter: jest.fn(),
    setParameters: jest.fn(),
    groupBy: jest.fn(),
    getQuery: jest.fn().mockReturnValue('SELECT 1'),
    getMany: jest.fn(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  };

  Object.values(mock).forEach((fn) => {
    if (jest.isMockFunction(fn)) {
      fn.mockReturnValue(mock);
    }
  });

  return mock as QueryBuilderMock<T>;
}

export function createRepositoryMock<T extends ObjectLiteral>() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn((entity) => entity),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as unknown as jest.Mocked<import('typeorm').Repository<T>>;
}

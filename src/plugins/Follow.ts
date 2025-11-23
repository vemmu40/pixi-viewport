import { Viewport } from '../Viewport';
import { Plugin } from './Plugin';

import type { Container, PointData } from 'pixi.js';

/** Options for {@link Follow}. */
export interface IFollowOptions
{
    /**
     * Speed to follow in px/frame (0 = teleport to location)
     *
     * @default 9
     */
    speed?: number;

    /**
     * Set acceleration to accelerate and decelerate at this rate; speed cannot be 0 to use acceleration
     *
     * @default null
     */
    acceleration?: number | null;

    /**
     * Radius (in world coordinates) of center circle where movement is allowed without moving the viewport
     *
     * @default null
     */
    radius?: number | null;

    /**
     * Follow point in canvas coordinates. If not provided, defaults to viewport center.
     * Will be converted to world coordinates internally.
     *
     * @default null
     */
    followPoint?: PointData;

}

const DEFAULT_FOLLOW_OPTIONS: Required<IFollowOptions> = {
    speed: 0,
    acceleration: null,
    radius: 0,
    followPoint: { x: 0, y: 0 },
};

/**
 * Plugin to follow a display-object.
 *
 * @see Viewport.follow
 * @public
 */
export class Follow extends Plugin
{
    /** The options used to initialize this plugin. */
    public readonly options: Required<IFollowOptions>;

    /** The target this plugin will make the viewport follow. */
    public target: Container;

    /** The velocity provided the viewport by following, at the current time. */
    protected velocity: PointData;

    /**
     * This is called by {@link Viewport.follow}.
     *
     * @param parent
     * @param target - target to follow
     * @param options
     */
    constructor(parent: Viewport, target: Container, options: IFollowOptions = {})
    {
        super(parent);

        this.target = target;
        this.options = Object.assign({}, DEFAULT_FOLLOW_OPTIONS, options);
        this.velocity = { x: 0, y: 0 };
    }

    public update(elapsed: number): void
    {
        if (this.paused)
        {
            return;
        }

        // Convert follow point from canvas coordinates to world coordinates
        const followPointWorld = this.parent.toWorld(this.options.followPoint
            ?? { x: this.parent.center.x, y: this.parent.center.y });

        let toX = this.target.x;
        let toY = this.target.y;

        if (this.options.radius)
        {
            const distance = Math.sqrt(
                Math.pow(this.target.y - followPointWorld.y, 2) + Math.pow(this.target.x - followPointWorld.x, 2)
            );

            if (distance > this.options.radius)
            {
                const angle = Math.atan2(this.target.y - followPointWorld.y, this.target.x - followPointWorld.x);

                toX = this.target.x - (Math.cos(angle) * this.options.radius);
                toY = this.target.y - (Math.sin(angle) * this.options.radius);
            }
            else
            {
                return;
            }
        }

        // Calculate offset from follow point (world coords) to viewport center
        const offsetX = followPointWorld.x - this.parent.center.x;
        const offsetY = followPointWorld.y - this.parent.center.y;

        // Calculate where viewport center should be to put target at follow point
        const targetCenterX = toX - offsetX;
        const targetCenterY = toY - offsetY;

        const deltaX = targetCenterX - this.parent.center.x;
        const deltaY = targetCenterY - this.parent.center.y;

        if (deltaX || deltaY)
        {
            if (this.options.speed)
            {
                if (this.options.acceleration)
                {
                    const angle = Math.atan2(deltaY, deltaX);
                    const distance = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));

                    if (distance)
                    {
                        const decelerationDistance = (Math.pow(this.velocity.x, 2) + Math.pow(this.velocity.y, 2))
                            / (2 * this.options.acceleration);

                        if (distance > decelerationDistance)
                        {
                            this.velocity = {
                                x: Math.min(this.velocity.x + (this.options.acceleration * elapsed), this.options.speed),
                                y: Math.min(this.velocity.y + (this.options.acceleration * elapsed), this.options.speed)
                            };
                        }
                        else
                        {
                            this.velocity = {
                                x: Math.max(this.velocity.x - (this.options.acceleration * elapsed), 0),
                                y: Math.max(this.velocity.y - (this.options.acceleration * elapsed), 0)
                            };
                        }
                        const changeX = Math.cos(angle) * this.velocity.x;
                        const changeY = Math.sin(angle) * this.velocity.y;
                        const x = Math.abs(changeX) > Math.abs(deltaX) ? targetCenterX : this.parent.center.x + changeX;
                        const y = Math.abs(changeY) > Math.abs(deltaY) ? targetCenterY : this.parent.center.y + changeY;

                        this.parent.moveCenter(x, y);
                        this.parent.emit('moved', { viewport: this.parent, type: 'follow' });
                    }
                }
                else
                {
                    const angle = Math.atan2(deltaY, deltaX);
                    const changeX = Math.cos(angle) * this.options.speed;
                    const changeY = Math.sin(angle) * this.options.speed;
                    const x = Math.abs(changeX) > Math.abs(deltaX) ? targetCenterX : this.parent.center.x + changeX;
                    const y = Math.abs(changeY) > Math.abs(deltaY) ? targetCenterY : this.parent.center.y + changeY;

                    this.parent.moveCenter(x, y);
                    this.parent.emit('moved', { viewport: this.parent, type: 'follow' });
                }
            }
            else
            {
                this.parent.moveCenter(targetCenterX, targetCenterY);
                this.parent.emit('moved', { viewport: this.parent, type: 'follow' });
            }
        }
    }

    /**
     * Set the follow point in canvas coordinates.
     * @param point - Canvas coordinates to follow, or null to use viewport center
     */
    public setFollowPoint(point: PointData | null): void
    {
        (this.options as any).followPoint = point;
    }

    /**
     * Get the current follow point in canvas coordinates.
     * @returns The current follow point or null if using viewport center
     */
    public getFollowPoint(): PointData | null
    {
        return this.options.followPoint;
    }
}
